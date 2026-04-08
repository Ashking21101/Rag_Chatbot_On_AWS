import os
import boto3
import time
from datetime import datetime
from decimal import Decimal
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from boto3.dynamodb.conditions import Key, Attr
from dotenv import load_dotenv
from jose import jwt

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# AWS Configuration
REGION = 'ap-south-1' 
TABLE_NAME = 'chat_history3' 
dynamodb = boto3.resource('dynamodb', region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

# AI Setup
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = PineconeVectorStore(index_name="basic-bot-1", embedding=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
model = ChatOpenAI(model="gpt-4-turbo", temperature=0)

# Strict Prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are NEXUS AI. Strictly use the provided context and current chat history. Do not assume past conversations exist if the history is empty."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("system", "Context: {context}"),
    ("human", "{query}"),
])

class ChatRequest(BaseModel):
    message: str
    thread_id: str

# Dynamic User Identification
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.get_unverified_claims(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid Token")
        return {"id": user_id}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid Token")













@app.get("/health")
async def health_check():
    """
    Endpoint to verify the API is alive and reachable.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "NEXUS AI"
    }





@app.get("/threads")
async def list_threads(user=Depends(get_current_user)):
    try:
        response = table.scan(
            FilterExpression=Attr('SessionId').begins_with(f"{user['id']}#") & Attr('Content').exists()
        )
        items = response.get('Items', [])
        
        if not items:
            return {"threads": []}
        
        thread_map = {}
        for item in items:
            thread_id = item['SessionId'].split('#')[1]
            if thread_id not in thread_map or item['Timestamp'] < thread_map[thread_id]:
                thread_map[thread_id] = item['Timestamp']
        
        sorted_threads = sorted(thread_map.items(), key=lambda x: x[1], reverse=True)
        threads_data = []
        
        for idx, (thread_id, ts) in enumerate(sorted_threads, 1):
            dt = datetime.fromtimestamp(float(ts))
            thread_name = f"trd{idx}-{dt.strftime('%m/%d/%y %H:%M:%S')}"
            threads_data.append({"id": thread_id, "name": thread_name})
        
        return {"threads": threads_data}
    except Exception as e:
        print(f"Error in list_threads: {e}")
        return {"threads": []}

@app.get("/thread-preview/{thread_id}")
async def get_thread_preview(thread_id: str, user=Depends(get_current_user)):
    session_id = f"{user['id']}#{thread_id}"
    try:
        res = table.query(KeyConditionExpression=Key('SessionId').eq(session_id))
        items = sorted(res.get('Items', []), key=lambda x: x.get('Timestamp', 0))
        preview = next((item['Content'] for item in items if item['Role'] == 'User'), f"chat_{thread_id[-5:]}")
        return {"preview": preview[:50] + "..." if len(preview) > 50 else preview}
    except Exception:
        return {"preview": f"chat_{thread_id[-5:]}"}

@app.get("/history/{thread_id}")
async def get_history(thread_id: str, user=Depends(get_current_user)):
    session_id = f"{user['id']}#{thread_id}"
    try:
        res = table.query(KeyConditionExpression=Key('SessionId').eq(session_id))
        messages = sorted(res.get('Items', []), key=lambda x: x.get('Timestamp', 0))
        return {"history": [{"role": m['Role'].lower(), "text": m['Content']} for m in messages]}
    except Exception:
        return {"history": []}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest, user=Depends(get_current_user)):
    session_id = f"{user['id']}#{request.thread_id}"
    try:
        docs = retriever.invoke(request.message)
        context = "\n".join([d.page_content for d in docs])
        
        res = table.query(KeyConditionExpression=Key('SessionId').eq(session_id))
        history_items = sorted(res.get('Items', []), key=lambda x: x.get('Timestamp', 0))
        chat_history = [HumanMessage(content=m['Content']) if m['Role']=='User' else AIMessage(content=m['Content']) for m in history_items]

        response = (prompt | model).invoke({"context": context, "chat_history": chat_history, "query": request.message})
        
        ts = Decimal(str(time.time()))
        table.put_item(Item={'SessionId': session_id, 'Timestamp': ts, 'Content': request.message, 'Role': 'User'})
        table.put_item(Item={'SessionId': session_id, 'Timestamp': ts + Decimal('0.0001'), 'Content': response.content, 'Role': 'AI'})
        
        return {"bot_response": response.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)