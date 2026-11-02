import os
from dotenv import load_dotenv
from groq import Groq
load_dotenv()



def create_ai_stream(message: str, history=None):
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY is missing.")

    client = Groq(api_key=api_key)

    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful AI assistant. "
                "Give clear, accurate and well-formatted answers. "
                "Use Markdown for headings, lists, tables and code "
                "when it helps readability."
            ),
        }
    ]

    if history:
        messages.extend(history)

    messages.append({
        "role": "user",
        "content": message,
    })

    return client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=messages, # type: ignore
        stream=True,
    )
