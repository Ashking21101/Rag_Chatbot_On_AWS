
<img width="944" height="566" alt="Screenshot 2026-04-09 at 12 47 52 AM" src="https://github.com/user-attachments/assets/8c336049-1de6-4a36-9018-dd0d1df12c0d" />



<img width="945" height="560" alt="Screenshot 2026-04-09 at 12 48 16 AM" src="https://github.com/user-attachments/assets/34f614e6-3c79-49ec-840e-79075722bf98" />



<img width="936" height="545" alt="Screenshot 2026-04-09 at 12 48 32 AM" src="https://github.com/user-attachments/assets/2da81ffc-6752-4899-8f98-6c15bd3f626b" />


















__________________________________BACKEND__________________________________

Approach = local -> docker -> ECR -> AppRunner -> Live

FOR UV = 
1. curl -LsSf https://astral.sh/uv/install.sh | sh
2. uv --version
3. uv venv
4. source .venv/bin/activate
5. uv init
6. uv add -r requirements.txt
7. uvicorn main:app --reload     (my main.py file : fastapi app) just to run loaccly
8. make dockerfile the build its image
8. docker build --platform linux/amd64 -t chatbot .   
9. docker images
10. docker run -p 8000:8000 --env-file .env chatbot
    Connect laptop port 8000 → container port 8000 and CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port" "8000"]-> makes it accessible to outside (0.0.0.0)
11. docker ps



12. For AWS 🟢 Step 1
🟢From Gemini
1. aws configure give -> access&secret key OR aws sts get-caller-identity
2. aws ecr create-repository --repository-name fastapi-bot --region ap-south-1 (or use console)
3. aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 919349292223.dkr.ecr.ap-south-1.amazonaws.com
4. docker build --platform linux/amd64 -t fastapi-bot .     (if not already done)
5. docker tag fastapi-bot:latest 919349292223.dkr.ecr.ap-south-1.amazonaws.com/fastapi-bot:latest
| Part                  | Meaning                 |
| --------------------- | ----------------------- |
| `fastapi-bot` (left)  | Local Docker image name |
| `fastapi-bot` (right) | ECR repository name     |

6. docker push 919349292223.dkr.ecr.ap-south-1.amazonaws.com/fastapi-bot:latest (ecr name)
🟢Go to the AWS Console and search for App Runner.
1. GO App runner-> create service
2. Browse for fastapi-bot and select the latest tag.
3. Important: Under "Configuration", add your OPENAI_API_KEY in the Environment Variables section and set the port to 8000., select "health check" as http and path as u defined in main.py



__________________________________FRONTEND__________________________________
Terminal
1. npx create-vite@latest chatbot-ui
2. cd chatbot-ui
3. npm install
4. npm run dev
5. const res = await fetch("http://127.0.0.1:8000/chat", { // https://fffddjsnrw.ap-south-1.awsapprunner.com/chat
6. React->body: JSON.stringify({ message: input }), "message" should be same name as in class ChatRequest(BaseModel): message: str in main.py
7. const botMessage = { role: "bot", text: data.bot_response }; should be same as return {"bot_response": response.choices[0].message.content}
8. above means I/O variables should be same in both
9. npm run build
10. S3 upload from Dist and add policy, enable static website, turnoff:block public access









__________________________________EXPLANATION__________________________________

``` bash
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn openai
COPY main.py .           # App Runner listens on 8080 by default , or 8000, use same in Apprunner 
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]


✅ Your Understanding (Polished)
“A Docker container is like a mini machine. Inside it, I set a working folder (/app). I start with a Python base image, copy requirements.txt into that folder, install dependencies inside the container, then copy the rest of my code into that folder, and finally run the app.”


1. uvicorn
“Start my backend server”
2. app:app
Format = file_name : variable_name
First app → app.py
Second app → app = FastAPI()



🟢 --port 8000
👉 Where the app runs inside the container
App is listening on port 8000 (inside container)

🟢 --host 0.0.0.0
👉 Who can access it
Accept requests from outside (not just inside container)








__________________________________AWS_Amplify__________________________________
npm install aws-amplify @aws-amplify/ui-react

pip install "python-jose[cryptography]"

pip install "python-jose[cryptography]" requests boto3 python-dotenv





---------------------------------------------------------------------------------------------------------------------------------------------
TO Test The Fastapi auth 


aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id 1ounaicr2v4u4iu8a7ri8ktmjt \
  --auth-parameters USERNAME=jimmyjimmyabcd1234@gmail.com,PASSWORD=Jimmy@123 \
  --region ap-south-1 \
  --query 'AuthenticationResult.IdToken' \
  --output text

And go to aws cognito app_clinet and enable passwordbasedauth


and Add some code in main.py
