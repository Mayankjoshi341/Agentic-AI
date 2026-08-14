from mistralai.client import Mistral
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

api = os.getenv("AGENT_API_KEY")

current_time = datetime.now().strftime("%D %I:%M %p")
system_instructions = """

"""
memory = [
    {
        "role": "system",
        "content": "You are a helpful AI assistant." 
    }
]
client = Mistral(api_key = api)

def chatbot(user_input):

    memory.append({"role" : "user" , "content": user_input})
    system_message = {
    "role": "system",
    "content": f"""
    You are a helpful AI assistant.
    Answer questions clearly and concisely.
    Current time: {datetime.now().strftime("%I:%M %p")}
    """}
    request_messages = [system_message] + memory[1:]
    response = client.chat.stream(
        model="mistral-small-latest",
        messages=request_messages
    )
    full_result = ""

    for event in response:

        chunk = event.data.choices[0].delta.content

        if chunk:
            print(chunk, end="", flush=True)
            full_result += str(chunk)

    print()
    memory.append({"role" : "system" , "content" : full_result})

while True:
    user_prompt = input("you : ")
    if user_prompt.lower() == "byee":
        print("Goodbyee")
        break 
    print("AI : " , end = "")
    chatbot(user_prompt)
