# from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig, TextIteratorStreamer
# import torch, threading

# from app.state import uploaded_text_store

# import faiss
# from sentence_transformers import SentenceTransformer
# import re
# import numpy as np

# MODEL_NAME = "HuggingFaceTB/SmolLM2-135M-Instruct"
# DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# config = BitsAndBytesConfig(
#     load_in_4bit=True,
#     bnb_4bit_use_double_quant=True,
#     bnb_4bit_quant_type="nf4",
#     bnb_4bit_compute_dtype=torch.float16
# )

# # Load tokenizer and model
# tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
# model = AutoModelForCausalLM.from_pretrained(
#     MODEL_NAME,
#     device_map="auto",
#     quantization_config=config,
#     attn_implementation="sdpa"
# ).to(DEVICE)

# embd_model = SentenceTransformer("all-MiniLM-L6-v2")

# model.eval()

# # Warmup run
# dummy_inputs = tokenizer("Hello", return_tensors="pt").to(DEVICE)
# with torch.inference_mode():
#     _ = model.generate(**dummy_inputs, max_new_tokens=1)

# def generate_response(message: str, max_new_tokens: int = 256, temp: float = 0.7):
    
#     #USER INPUT DOC CONTEXT
#     #USER MESSAGE EMBEDDING
#     chunks = uploaded_text_store.get("chunks")
#     index = uploaded_text_store.get("index")

#     msg_embd = embd_model.encode([message], convert_to_numpy = True)
#     D, I = index.search(msg_embd, k = 5)
#     relevant_chunk = [chunks[i] for i in I[0]]
#     context = "\n".join(relevant_chunk)

#     """Stream tokens from the model response"""

#     prompt = F"Context:\n{context}\n\nQuestion:\n{message}"
#     # prompt = F"Question:\n{message}"

#     inputs = tokenizer.apply_chat_template(
#         [{"role": "user", "content": prompt}],
#         add_generation_prompt=True,
#         tokenize=True,
#         return_tensors="pt",
#     ).to(DEVICE)

#     if isinstance(inputs, torch.Tensor):
#         inputs = {"input_ids": inputs}
#     inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

#     streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

#     def run_generation():
#         with torch.inference_mode(), torch.autocast("cuda", dtype=torch.float16):
#             model.generate(
#                 **inputs,
#                 max_new_tokens=max_new_tokens,
#                 temperature=temp,
#                 do_sample=True,
#                 top_k=50,
#                 top_p=0.9,
#                 streamer=streamer,
#                 use_cache=True,
#             )

#     threading.Thread(target=run_generation).start()

#     for token in streamer:
#         yield token
    
#     # response_text = ""
#     # buffer = []

#     # for token in streamer:
#     #   buffer.append(token)

#     #   if len(buffer) >= 1:
#     #     response_text += "".join(buffer)
#     #     buffer = []
#     #     yield response_text

#     # if buffer:
#     #   response_text += "".join(buffer)
#     #   yield response_text