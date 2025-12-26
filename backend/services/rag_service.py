import os
import time
from fastapi import BackgroundTasks
from core.ai_config import get_embeddings, get_embeddings_batch, pc
from pinecone import ServerlessSpec
from dotenv import load_dotenv

load_dotenv()

PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "csms-rag")

def ensure_index_exists():
    """
    Checks if the Pinecone index exists and creates it if not.
    """
    try:
        existing_indexes = [index.name for index in pc.list_indexes()]
        if PINECONE_INDEX_NAME not in existing_indexes:
            print(f"Index '{PINECONE_INDEX_NAME}' not found. Creating it...")
            pc.create_index(
                name=PINECONE_INDEX_NAME,
                dimension=1024,  # Dimension for mistral-embed
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )
            # Wait for index to be ready
            while not pc.describe_index(PINECONE_INDEX_NAME).status['ready']:
                time.sleep(1)
            print(f"Index '{PINECONE_INDEX_NAME}' created successfully.")
    except Exception as e:
        print(f"Error ensuring index exists: {e}")

def reset_index():
    """
    Deletes all vectors in the index.
    """
    print(f"Resetting index '{PINECONE_INDEX_NAME}'...")
    ensure_index_exists()
    try:
        index = pc.Index(PINECONE_INDEX_NAME)
        index.delete(delete_all=True)
        print("Index reset successfully.")
    except Exception as e:
        print(f"Error resetting index: {e}")

def upsert_data_bulk(items: list):
    """
    Generates embeddings and upserts data to Pinecone in batches.
    items: List of dicts with keys 'vector_id', 'data_text', 'metadata'
    """
    print(f"Starting bulk RAG update for {len(items)} items...")
    ensure_index_exists()
    
    try:
        index = pc.Index(PINECONE_INDEX_NAME)
        
        # Process in batches
        BATCH_SIZE = 50 # Mistral might have limits on batch size
        
        for i in range(0, len(items), BATCH_SIZE):
            batch_items = items[i:i + BATCH_SIZE]
            texts = [item['data_text'] for item in batch_items]
            
            embeddings = get_embeddings_batch(texts)
            if not embeddings:
                print(f"Failed to generate embeddings for batch {i}")
                continue
                
            vectors = []
            for j, item in enumerate(batch_items):
                vectors.append({
                    "id": item['vector_id'],
                    "values": embeddings[j],
                    "metadata": {
                        "text": item['data_text'],
                        **item['metadata']
                    }
                })
                
            index.upsert(vectors=vectors)
            print(f"Upserted batch {i} to {i + len(batch_items)}")
            
    except Exception as e:
        print(f"Error in bulk upsert: {e}")

def upsert_data(vector_id: str, data_text: str, metadata: dict):
    """
    Generates embeddings and upserts data to Pinecone.
    """
    print(f"Starting RAG update for {vector_id}...")
    
    # Ensure index exists before proceeding
    ensure_index_exists()

    embedding = get_embeddings(data_text)
    if not embedding:
        print(f"Failed to generate embeddings for {vector_id}")
        return

    try:
        index = pc.Index(PINECONE_INDEX_NAME)
        
        index.upsert(
            vectors=[
                {
                    "id": vector_id,
                    "values": embedding,
                    "metadata": {
                        "text": data_text,
                        **metadata
                    }
                }
            ]
        )
        print(f"Successfully upserted RAG data for {vector_id}")
    except Exception as e:
        print(f"Error upserting to Pinecone: {e}")

def delete_data(vector_id: str):
    """
    Deletes a vector from Pinecone.
    """
    print(f"Starting RAG deletion for {vector_id}...")
    try:
        index = pc.Index(PINECONE_INDEX_NAME)
        index.delete(ids=[vector_id])
        print(f"Successfully deleted RAG data for {vector_id}")
    except Exception as e:
        print(f"Error deleting from Pinecone: {e}")

def delete_data_bulk(vector_ids: list):
    """
    Deletes multiple vectors from Pinecone.
    Handles batching to avoid hitting Pinecone limits (1000 items per call).
    """
    print(f"Starting RAG bulk deletion for {len(vector_ids)} items...")
    try:
        index = pc.Index(PINECONE_INDEX_NAME)
        
        # Batch size for Pinecone delete
        BATCH_SIZE = 1000
        
        for i in range(0, len(vector_ids), BATCH_SIZE):
            batch = vector_ids[i:i + BATCH_SIZE]
            index.delete(ids=batch)
            print(f"Deleted batch of {len(batch)} items.")
            
        print(f"Successfully deleted RAG data for {len(vector_ids)} items")
    except Exception as e:
        print(f"Error deleting from Pinecone: {e}")

def delete_all_vectors():
    """
    Deletes ALL vectors from the Pinecone index.
    """
    print(f"Starting full RAG index wipe...")
    try:
        index = pc.Index(PINECONE_INDEX_NAME)
        index.delete(delete_all=True)
        print("Successfully deleted ALL vectors from Pinecone.")
    except Exception as e:
        print(f"Error wiping Pinecone index: {e}")

def trigger_rag_update(background_tasks: BackgroundTasks, vector_id: str, data_text: str, metadata: dict):
    """
    Triggers the RAG update as a background task.
    """
    background_tasks.add_task(upsert_data, vector_id, data_text, metadata)

def trigger_rag_delete(background_tasks: BackgroundTasks, vector_id: str):
    """
    Triggers the RAG deletion as a background task.
    """
    background_tasks.add_task(delete_data, vector_id)

def trigger_rag_bulk_delete(background_tasks: BackgroundTasks, vector_ids: list):
    """
    Triggers the RAG bulk deletion as a background task.
    """
    background_tasks.add_task(delete_data_bulk, vector_ids)

# Legacy support for existing calls (if any)
def upsert_user_data(user_id: int, role: str, data_text: str):
    vector_id = f"{role}_{user_id}"
    upsert_data(vector_id, data_text, {"user_id": user_id, "role": role})

