import os
from pathlib import Path
from pinecone import Pinecone
from mistralai import Mistral
from dotenv import load_dotenv

# Load .env from backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

# Initialize Clients
pc = Pinecone(api_key=PINECONE_API_KEY)
mistral_client = Mistral(api_key=MISTRAL_API_KEY)

def get_embeddings(text: str):
    """
    Generates embeddings for the given text using Mistral's embedding model.
    """
    try:
        embeddings_batch_response = mistral_client.embeddings.create(
            model="mistral-embed",
            inputs=[text],
        )
        return embeddings_batch_response.data[0].embedding
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        return None

def get_embeddings_batch(texts: list):
    """
    Generates embeddings for a list of texts using Mistral's embedding model.
    """
    try:
        embeddings_batch_response = mistral_client.embeddings.create(
            model="mistral-embed",
            inputs=texts,
        )
        return [data.embedding for data in embeddings_batch_response.data]
    except Exception as e:
        print(f"Error generating batch embeddings: {e}")
        return None
