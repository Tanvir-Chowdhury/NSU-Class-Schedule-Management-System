from __future__ import annotations
import logging
import random
import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set

from sqlalchemy.orm import Session
from sqlalchemy import or_

from core.constants import LAB_DAYS, THEORY_DAYS, TIME_SLOTS
from models.academic import ClassType, DurationMode, Room
from models.schedule import ClassSchedule, Section
from models.teacher import Teacher, TeacherPreference, TeacherTimingPreference
from services.scheduler import ensure_tba_teacher

logger = logging.getLogger("scheduler")
logging.basicConfig(level=logging.INFO)

# --- CONFIGURATION ---
SCORE_PERFECT_MATCH = 100.0       
SCORE_DAY_MATCH = 75.0            
SCORE_RESCUE_MATCH = 60.0         # Score for assigning a teacher with 0 load (High Priority)
SCORE_DEPT_FALLBACK = 40.0        
PENALTY_TBA = -100000.0           # Massive penalty
DEFAULT_MAX_SECTIONS = 4          # Reasonable limit for fallback assignments

@dataclass
class Quality:
    mean_score: float = 0.0
    min_score: float = 0.0
    variance: float = 0.0
    overall_score: float = 0.0
    teacher_scores: List[Dict] = field(default_factory=list)

@dataclass
class RunResult:
    total_scheduled: int
    quality: Quality
    total_sections: int
    assigned_non_tba: int
    assigned_tba: int
    unscheduled: int

class CpSatAutoScheduler:
    def __init__(self, time_limit_seconds: float = 60.0, seed: int = 1):
        self.seed = seed
        self.rng = random.Random(seed)

    def _normalize_type(self, type_str: str) -> str:
        s = str(type_str).strip().upper()
        if 'LAB' in s: return 'LAB'
        return 'THEORY'

    def _get_room_floor(self, room_number: str) -> int:
        match = re.search(r'\d', room_number)
        return int(match.group()) if match else 0

    def _get_dept_floor(self, department: str) -> int:
        mapping = {"CSE": 3, "EEE": 4, "BBA": 2, "ENG": 5}
        return mapping.get(str(department).upper(), 0)

    def _extract_dept_from_code(self, code: str) -> str:
        match = re.match(r"([A-Za-z]+)", code)
        return match.group(1).upper() if match else "GEN"

    def run(self, db: Session, rebuild: bool = True) -> RunResult:
        logger.info("--- Starting Zero-Load Rescue Scheduler ---")

        tba = ensure_tba_teacher(db)
        if rebuild:
            db.query(ClassSchedule).delete(synchronize_session=False)
            db.commit()

        teachers = db.query(Teacher).all()
        rooms = db.query(Room).all()
        sections = db.query(Section).all()
        
        # --- 1. DATA PREP ---
        quota_limits = defaultdict(int)
        course_applicants = defaultdict(set) 
        dept_teachers = defaultdict(list)

        teacher_info = {}
        for t in teachers:
            is_adjunct = (t.faculty_type or "").strip().lower() == "adjunct"
            dept = (t.department or "").strip().upper()
            
            # Map Dept for fallback (Permanent only)
            if not is_adjunct and t.id != tba.id:
                # Handle variations like "Electrical Engineering" -> "EEE" if needed
                # For now assuming straightforward mapping or code prefix matching
                dept_teachers[dept].append(t.id)
                # Also map 'General' teachers to common codes if necessary
                if dept in ['GEN', 'GENERAL']:
                    dept_teachers['GED'].append(t.id)

            timings = db.query(TeacherTimingPreference).filter_by(teacher_id=t.id).all()
            pref_days = set()
            pref_slots = set()
            for tp in timings:
                days = THEORY_DAYS.get(tp.day, [tp.day])
                for d in days:
                    pref_days.add(d)
                    for s_id, s_range in TIME_SLOTS.items():
                        if tp.start_time in s_range:
                            pref_slots.add((d, s_id))
            
            teacher_info[t.id] = {
                'obj': t,
                'is_adjunct': is_adjunct,
                'dept': dept,
                'pref_days': pref_days,
                'pref_slots': pref_slots,
                'assigned_count': 0,
                'total_score': 0
            }

        all_prefs = db.query(TeacherPreference).filter(
            or_(TeacherPreference.status == 'accepted', TeacherPreference.status == 'pending')
        ).all()
        
        for p in all_prefs:
            base_code = p.course.code.upper().strip()
            if base_code.endswith('L'): base_code = base_code[:-1]
            limit = int(p.section_count or 0)
            if limit == 0: limit = DEFAULT_MAX_SECTIONS
            quota_limits[(p.teacher_id, base_code)] = max(quota_limits[(p.teacher_id, base_code)], limit)
            course_applicants[base_code].add(p.teacher_id)

        quota_usage = defaultdict(int)     
        global_usage = defaultdict(int)    
        occupied_slots = set()             
        pattern_usage = defaultdict(int) # Track usage of ST, MW, RA to balance them

        # --- 2. GROUPING ---
        grouped_sections = defaultdict(list)
        for s in sections:
            base_code = s.course.code.upper().strip()
            if base_code.endswith('L'): base_code = base_code[:-1]
            grouped_sections[(base_code, s.section_number)].append(s)

        # Sort: Hardest First
        def group_priority(group):
            score = 0
            base_code = group[0].course.code.upper().strip()
            if base_code.endswith('L'): base_code = base_code[:-1]
            
            for s in group:
                if self._normalize_type(s.course.type) == 'LAB': score += 1000
                if s.course.duration_mode == DurationMode.EXTENDED: score += 500
            
            # Boost priority if requested by Adjuncts (who have harder constraints)
            applicants = course_applicants.get(base_code, set())
            for tid in applicants:
                if tid in teacher_info and teacher_info[tid]['is_adjunct']:
                    score += 200
            
            return score
        
        sorted_keys = sorted(grouped_sections.keys(), key=lambda k: group_priority(grouped_sections[k]), reverse=True)

        total_scheduled = 0
        assigned_non_tba = 0
        assigned_tba = 0
        
        # --- 3. SCHEDULING LOOP ---
        for key in sorted_keys:
            group = grouped_sections[key]
            base_code = key[0]
            group_dept = self._extract_dept_from_code(base_code)
            
            # --- CANDIDATE GENERATION ---
            candidates = []

            # A. Preferred Candidates
            pref_tids = course_applicants.get(base_code, [])
            for tid in pref_tids:
                if tid == tba.id: continue
                # Strict check against their own requested limit
                if quota_usage[(tid, base_code)] < quota_limits[(tid, base_code)]:
                     candidates.append({'tid': tid, 'type': 'PREF'})

            # B. Dept Fallback (Rescue & Fill)
            # Find ALL permanent teachers in this department
            # Logic: If course is CSE115, look in CSE dept.
            dept_matches = dept_teachers.get(group_dept, [])
            
            # Special handling for Foundation courses (ENG, MAT, etc)
            if not dept_matches and group_dept in ['MAT', 'ENG', 'PHY', 'CHE', 'BIO']:
                 # Try to find teachers mapped to these specific departments
                 pass 

            for tid in dept_matches:
                # Skip if already in preferred list
                if tid in pref_tids: continue
                
                # Load Check: Don't overload fallback teachers
                current_load = global_usage[tid]
                if current_load < DEFAULT_MAX_SECTIONS:
                    # Classify as "RESCUE" if they have very low load (0-1), else "FALLBACK"
                    c_type = 'RESCUE' if current_load < 2 else 'FALLBACK'
                    candidates.append({'tid': tid, 'type': c_type})

            # C. TBA (Last Resort)
            candidates.append({'tid': tba.id, 'type': 'TBA'})

            # --- SORTING CANDIDATES (CRITICAL) ---
            # We shuffle first to randomize within tiers
            self.rng.shuffle(candidates)
            
            # Sort Key:
            # 1. TBA is last (False < True)
            # 2. Priority Score (Rescue > Pref > Fallback)
            #    Rescue (0 load) needs to be prioritized to fix "Unassigned" issue.
            #    But we also want to honor preferences.
            #    Let's mix: Pref is good, but Rescue is FAIR.
            
            def candidate_rank(c):
                if c['type'] == 'TBA': return -1
                if c['type'] == 'PREF': return 3  # Highest priority: They asked for it
                if c['type'] == 'RESCUE': return 2 # Next: They have no work, give them this!
                return 1 # Fallback: They have work, but can take more
            
            # Additional tie-breaker: Current Load (Ascending)
            # If two people are PREF, give to the one with less work.
            
            candidates.sort(key=lambda x: (
                candidate_rank(x), 
                -global_usage[x['tid']] # Negative because we want Ascending load, but sort is Reverse=True? No, let's keep simple logic.
            ), reverse=True)
            
            # Wait, complex sort. Let's make it simpler.
            # We want the list to start with the BEST candidate.
            # Sort DESCENDING by rank.
            # Inside rank, we want LOWER load.
            # So key = (rank, -load). 
            # (3, 0) > (3, -5) -> Rank 3 Load 0 is better than Rank 3 Load 5. Correct.
            
            candidates.sort(key=lambda x: (candidate_rank(x), -global_usage.get(x['tid'], 0)), reverse=True)

            # --- ATTEMPT SCHEDULE ---
            best_plan = None
            best_score = -float('inf')

            for cand in candidates:
                tid = cand['tid']
                ctype = cand['type']
                t_data = teacher_info[tid]

                # RELAXED CONSTRAINT:
                # If it's a PREF candidate (they explicitly asked for this course), 
                # we ignore the general 'pref_days' constraint.
                # We only enforce it for Adjuncts who are NOT PREF (which shouldn't happen in this logic, but good for safety).
                # UPDATE: Adjuncts MUST have their preferred days respected even if they requested the course.
                if tid != tba.id and t_data['is_adjunct'] and not t_data['pref_days']:
                    continue 

                group_options = []
                possible = True

                # Building Preference Configuration
                SAC_DEPTS = {'CSE', 'EEE', 'ETE', 'ECE', 'MAT', 'PHY', 'CHE', 'BIO', 'ENV', 'PHR', 'CE', 'ARCH', 'CIT'}
                NAC_DEPTS = {'BBA', 'ECO', 'ENG', 'BEN', 'HIS', 'PHI', 'SOC', 'LAW', 'POL', 'MGT', 'MKT', 'FIN', 'INB', 'MIS', 'HRM', 'BUS'}

                for sec in group:
                    # Room Filter
                    target_type = self._normalize_type(sec.course.type)
                    valid_rooms = [r for r in rooms if self._normalize_type(r.type) == target_type]
                    
                    # Apply Building Constraint based on Department
                    if group_dept in SAC_DEPTS:
                        sac_rooms = [r for r in valid_rooms if r.room_number.upper().startswith('SAC')]
                        if sac_rooms: valid_rooms = sac_rooms
                    elif group_dept in NAC_DEPTS:
                        nac_rooms = [r for r in valid_rooms if r.room_number.upper().startswith('NAC')]
                        if nac_rooms: valid_rooms = nac_rooms

                    if not valid_rooms: valid_rooms = rooms 

                    sec_opts = []
                    is_extended = sec.course.duration_mode == DurationMode.EXTENDED
                    
                    # Pattern Selection (Balanced)
                    patterns = list(LAB_DAYS) if target_type == 'LAB' else list(THEORY_DAYS.keys())
                    # Sort patterns by usage count (ascending) to ensure equal distribution
                    patterns.sort(key=lambda p: (pattern_usage[p], self.rng.random()))

                    for pattern in patterns:
                        actual_days = [pattern] if pattern in LAB_DAYS else THEORY_DAYS[pattern]
                        
                        # ADJUNCT CONSTRAINT: Must be on preferred days
                        if tid != tba.id and t_data['is_adjunct']:
                            if not all(d in t_data['pref_days'] for d in actual_days):
                                continue 
                        
                        for slot in range(1, 8):
                            if is_extended and slot == 7: continue

                            # Availability
                            blocked = False
                            req_slots = [slot, slot+1] if is_extended else [slot]
                            
                            if tid != tba.id:
                                for d in actual_days:
                                    for s in req_slots:
                                        if (tid, d, s) in occupied_slots:
                                            blocked = True; break
                                    if blocked: break
                            if blocked: continue

                            # Scoring
                            score = 0
                            if tid == tba.id: 
                                score = PENALTY_TBA
                            else:
                                match_d = all(d in t_data['pref_days'] for d in actual_days)
                                match_s = True
                                for d in actual_days:
                                    for s in req_slots:
                                        if (d, s) not in t_data['pref_slots']:
                                            match_s = False; break
                                
                                # Base Score
                                score = 100.0
                                
                                # Penalties
                                if not match_d:
                                    score -= 25.0 # Day Mismatch (Permanent only, Adjuncts filtered above)
                                
                                if not match_s:
                                    score -= 10.0 # Slot Mismatch
                                
                                # Candidate Type Adjustments
                                if ctype == 'RESCUE':
                                    score -= 10.0 # Slight penalty for rescue to prefer PREF
                                elif ctype == 'FALLBACK':
                                    score -= 30.0 # Larger penalty for fallback

                            # Room
                            for room in valid_rooms:
                                r_blocked = False
                                for d in actual_days:
                                    for s in req_slots:
                                        if (room.id, d, s) in occupied_slots:
                                            r_blocked = True; break
                                    if r_blocked: break
                                
                                if not r_blocked:
                                    if tid != tba.id:
                                        if self._get_room_floor(room.room_number) == self._get_dept_floor(t_data['dept']):
                                            score += 5 # Floor bonus
                                    
                                    sec_opts.append({
                                        'room': room,
                                        'pattern': pattern,
                                        'days': actual_days,
                                        'slot': slot,
                                        'req_slots': req_slots,
                                        'score': score
                                    })
                                    break 
                    
                    if not sec_opts:
                        possible = False
                        break
                    group_options.append(sec_opts)

                if not possible: continue

                # Combine
                curr_plan = None
                if len(group) == 1:
                    best = max(group_options[0], key=lambda x: x['score'])
                    curr_plan = {'tid': tid, 'assigns': [best], 'score': best['score']}
                elif len(group) == 2:
                    opts1 = sorted(group_options[0], key=lambda x: x['score'], reverse=True)
                    opts2 = sorted(group_options[1], key=lambda x: x['score'], reverse=True)
                    for o1 in opts1:
                        if curr_plan: break
                        for o2 in opts2:
                            overlap = False
                            for d1 in o1['days']:
                                for d2 in o2['days']:
                                    if d1 == d2:
                                        if set(o1['req_slots']) & set(o2['req_slots']):
                                            overlap = True; break
                                if overlap: break
                            if not overlap:
                                curr_plan = {'tid': tid, 'assigns': [o1, o2], 'score': o1['score'] + o2['score']}
                                break
                
                if curr_plan:
                    # GREEDY ACCEPTANCE MODIFIED
                    # Only accept immediately if it's a PERFECT score (100.0)
                    # Otherwise, keep searching for a better slot/day.
                    if tid != tba.id:
                         if curr_plan['score'] >= 100.0: # Perfect match found
                             best_plan = curr_plan
                             best_score = curr_plan['score']
                             break 
                         
                         # If not perfect, keep it if it's better than what we have
                         if curr_plan['score'] > best_score:
                             best_score = curr_plan['score']
                             best_plan = curr_plan
                    else:
                        # For TBA, just take whatever is best
                        if curr_plan['score'] > best_score:
                            best_score = curr_plan['score']
                            best_plan = curr_plan

            # --- COMMIT ---
            if best_plan:
                tid = best_plan['tid']
                
                if tid != tba.id:
                    quota_usage[(tid, base_code)] += 1
                    global_usage[tid] += 1

                for idx, assign in enumerate(best_plan['assigns']):
                    sec = group[idx]
                    sec.teacher_id = tid
                    
                    # Update pattern usage to maintain balance
                    pattern_usage[assign['pattern']] += 1
                    
                    for s_idx in assign['req_slots']:
                        sched = ClassSchedule(
                            section_id=sec.id,
                            room_id=assign['room'].id,
                            day=assign['pattern'],
                            time_slot_id=s_idx,
                            is_friday_booking=(assign['pattern'] == 'Friday' or 'Friday' in assign['days']),
                            availability=assign['room'].capacity
                        )
                        db.add(sched)
                        for d in assign['days']:
                            occupied_slots.add((assign['room'].id, d, s_idx))
                            if tid != tba.id:
                                occupied_slots.add((tid, d, s_idx))
                    total_scheduled += 1
                
                if tid == tba.id:
                    assigned_tba += len(best_plan['assigns'])
                else:
                    assigned_non_tba += len(best_plan['assigns'])
                    t_data = teacher_info[tid]
                    t_data['assigned_count'] += len(best_plan['assigns'])
                    
                    # Correct Score Calculation: STRICT COMPLIANCE ONLY
                    # We recalculate the score based purely on Day/Slot match, ignoring scheduler bonuses.
                    batch_total = 0
                    for assign in best_plan['assigns']:
                        # Check Day Match
                        match_d = all(d in t_data['pref_days'] for d in assign['days'])
                        
                        # Check Slot Match
                        match_s = True
                        for d in assign['days']:
                            for s in assign['req_slots']:
                                if (d, s) not in t_data['pref_slots']:
                                    match_s = False; break
                        
                        # Strict Scoring
                        item_score = 100.0
                        if not match_d: item_score -= 25.0
                        if not match_s: item_score -= 10.0
                        
                        batch_total += max(0.0, item_score)

                    t_data['total_score'] += batch_total
            else:
                logger.warning(f"FAILED to schedule group {base_code}-{group[0].section_number}")

        db.commit()

        # Stats
        teacher_scores_list = []
        all_scores = []
        for tid, info in teacher_info.items():
            if tid == tba.id: continue
            
            # Calculate Target Load (Total sections they requested/were willing to take)
            # We sum up the quota limits for this teacher across all courses they applied for.
            target_load = 0
            for (t_id, c_code), limit in quota_limits.items():
                if t_id == tid:
                    target_load += limit
            
            # If they didn't apply for anything specific, assume default max (fallback)
            if target_load == 0: target_load = DEFAULT_MAX_SECTIONS

            # Calculation for display
            # Formula: (Total Compliance Points) / (Target Load * 100) * 100
            # This penalizes them for unassigned sections.
            # Example: Wanted 4, Got 2 Perfect (200 pts). Score = 200 / 400 = 50%.
            
            final_score = 0.0
            if target_load > 0:
                final_score = (info['total_score'] / (target_load * 100.0)) * 100.0
            
            # Cap at 100 just in case
            final_score = min(100.0, max(0.0, final_score))
            
            all_scores.append(final_score)
            
            teacher_scores_list.append({
                "teacher_id": tid,
                "initial": info['obj'].initial,
                "name": info['obj'].name,
                "assigned_sections": info['assigned_count'],
                "score_out_of_100": round(final_score, 2)
            })

        final_mean = sum(all_scores)/len(all_scores) if all_scores else 0
        
        # Variance Calculation
        variance = 0.0
        if all_scores:
            variance = sum((x - final_mean) ** 2 for x in all_scores) / len(all_scores)

        qual = Quality(
            mean_score=round(final_mean, 2),
            min_score=round(min(all_scores) if all_scores else 0, 2),
            variance=round(variance, 2),
            overall_score=round(final_mean, 2),
            teacher_scores=teacher_scores_list
        )
        
        logger.info(f"Done. Assigned {assigned_non_tba}/{len(sections)} to teachers.")

        return RunResult(
            total_scheduled=total_scheduled,
            quality=qual,
            total_sections=len(sections),
            assigned_non_tba=assigned_non_tba,
            assigned_tba=assigned_tba,
            unscheduled=len(sections) - total_scheduled
        )