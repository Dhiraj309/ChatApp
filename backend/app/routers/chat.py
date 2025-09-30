# from fastapi import APIRouter, Body, UploadFile, File
# from fastapi.responses import StreamingResponse, JSONResponse
# from llm import generate_response
# from app.state import uploaded_text_store

# import os
# import tempfile

# import faiss
# from sentence_transformers import SentenceTransformer
# import re

# embd_model = SentenceTransformer("all-MiniLM-L6-v2")

# router = APIRouter()

# @router.post("/")
# def chat(payload: dict = Body(...)):
#     message = payload.get("message", "")

#     def event_stream():
#         for token in generate_response(message):
#             yield token

#     return StreamingResponse(event_stream(), media_type="text/plain")

# def chunk_text(texts, max_words = 200, overlap = 10):
#     texts = str(texts)
#     sentences = re.split(r'(?<=[.?!])\s+', texts.strip())

#     chunks, current_chunk, word_count = [], [], 0

#     for sent in sentences:
#         sent_words = sent.split()
#         if word_count + len(sent_words) <= max_words:
#             current_chunk.append(sent)
#             word_count += len(sent)

#         else:
#             chunks.append(" ".join(current_chunk))

#             if overlap > 0 and current_chunk:
#                 overlap_words = " ".join(current_chunk[-overlap:])
#                 current_chunk = [overlap_words, sent]
#                 word_count = len(overlap_words.split()) + len(sent_words)

#             else:
#                 current_chunk = [sent]
#                 word_count = len(sent_words)
#     if current_chunk:
#         chunks.append(" ".join(current_chunk))

#     return chunks

# @router.post("/upload")
# async def upload_file(file: UploadFile = File(...)):
#     with tempfile.NamedTemporaryFile(delete = False) as temp:
#         temp.write(await file.read())
#         temp_path = temp.name

#     ext = os.path.splitext(file.filename)[1].lower()

#     extracted_text = ""

#     try:
#         if ext == ".txt":
#             with open(temp_path, "r", encoding="utf-8") as f:
#                 extracted_text = f.read()

#         elif ext == ".pdf":
#             from PyPDF2 import PdfReader
#             reader = PdfReader(temp_path)
#             extracted_text = "\n".join([page.extract_text() for page in reader.pages])

#         elif ext in [".docx", ".doc"]:
#             from docx import Document
#             doc = Document(temp_path)
#             extracted_text = "\n".join([p.text for p in doc.paragraphs])

#         else:
#             return None
        
#     finally:
#         os.remove(temp_path)

#     # USER INPUT DOC CONTEXT
#     text = extracted_text
#     chunks = chunk_text(text)
#     chunk_embd = embd_model.encode(chunks, convert_to_numpy = True)

#     #DOC EMBEDDING
#     dimensions = chunk_embd.shape[1]
#     index = faiss.IndexFlatL2(dimensions)
#     index.add(chunk_embd)

#     uploaded_text_store["chunks"] = chunks
#     uploaded_text_store["index"] = index

#     return JSONResponse({
#         "message" : "Successfully Extracted Texts From File"
#         })


from fastapi import APIRouter, Body, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from app.state import uploaded_text_store

import os
import tempfile
import requests
import faiss
from sentence_transformers import SentenceTransformer
import re

embd_model = SentenceTransformer("all-MiniLM-L6-v2")

router = APIRouter()

# Secure Colab endpoint + API key
COLAB_URL = os.getenv("COLAB_URL", "URL")
API_KEY = os.getenv("INFERENCE_API_KEY", "KEY")

@router.post("/")
def chat(payload: dict = Body(...)):
    message = payload.get("message", "")

    def event_stream():
        with requests.post(
            COLAB_URL,
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={"message": message},
            stream=True
        ) as r:
            if r.status_code != 200:
                yield f"Error: {r.status_code} - {r.text}"
                return

            for chunk in r.iter_content(chunk_size=None):
                if chunk:
                    yield chunk.decode("utf-8")

    return StreamingResponse(event_stream(), media_type="text/plain")


def chunk_text(texts, max_words=200, overlap=10):
    texts = str(texts)
    sentences = re.split(r'(?<=[.?!])\s+', texts.strip())

    chunks, current_chunk, word_count = [], [], 0

    for sent in sentences:
        sent_words = sent.split()
        if word_count + len(sent_words) <= max_words:
            current_chunk.append(sent)
            word_count += len(sent)

        else:
            chunks.append(" ".join(current_chunk))

            if overlap > 0 and current_chunk:
                overlap_words = " ".join(current_chunk[-overlap:])
                current_chunk = [overlap_words, sent]
                word_count = len(overlap_words.split()) + len(sent_words)

            else:
                current_chunk = [sent]
                word_count = len(sent_words)
    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False) as temp:
        temp.write(await file.read())
        temp_path = temp.name

    ext = os.path.splitext(file.filename)[1].lower()
    extracted_text = ""

    try:
        if ext == ".txt":
            with open(temp_path, "r", encoding="utf-8") as f:
                extracted_text = f.read()

        elif ext == ".pdf":
            from PyPDF2 import PdfReader
            reader = PdfReader(temp_path)
            extracted_text = "\n".join([page.extract_text() for page in reader.pages])

        elif ext in [".docx", ".doc"]:
            from docx import Document
            doc = Document(temp_path)
            extracted_text = "\n".join([p.text for p in doc.paragraphs])

        else:
            return JSONResponse({"error": "Unsupported file type"}, status_code=400)

    finally:
        os.remove(temp_path)

    # USER INPUT DOC CONTEXT
    text = extracted_text
    chunks = chunk_text(text)
    chunk_embd = embd_model.encode(chunks, convert_to_numpy=True)

    # DOC EMBEDDING
    dimensions = chunk_embd.shape[1]
    index = faiss.IndexFlatL2(dimensions)
    index.add(chunk_embd)

    uploaded_text_store["chunks"] = chunks
    uploaded_text_store["index"] = index

    return JSONResponse({
        "message": "Successfully Extracted Texts From File"
    })
