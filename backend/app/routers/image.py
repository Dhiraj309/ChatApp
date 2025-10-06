from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
import os, requests
from dotenv import load_dotenv

load_dotenv()
INFERENCE_API_KEY = os.getenv("INFERENCE_API_KEY")
COLAB_URL = os.getenv("COLAB_URL")

router = APIRouter()

@router.post("/")
def generate_image(
    payload: dict = Body(...)
):
    prompt = payload.get("prompt", "")
    if not prompt:
        return JSONResponse({
            "error": "Prompt Cant Be Empty."
        }, status_code=400
        )
    
    try:
        res = requests.post(
            f"{COLAB_URL}/image/",
            header={"Authorization": f"Bearer {INFERENCE_API_KEY}"},
            json={"prompt": prompt},
            timeout=600
        )

        if res.status_code != 200:
            return JSONResponse(
                {
                    "error": f"Colab Error {res.status_code}",
                    "details": res.text
                }
            )
        
        return JSONResponse(res.json())


    except Exception as e:
        return JSONResponse({
            "error": f"Backend Error: {e}"
        }, status_code=500)