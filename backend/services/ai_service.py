import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(
    api_key=os.getenv("DOUBAO_API_KEY", ""),
    base_url="https://ark.cn-beijing.volces.com/api/v3",
)
MODEL = os.getenv("DOUBAO_MODEL", "doubao-pro-32k")

SYSTEM_PROMPT = """你是一位精通大藏经的佛学导师，法号「慧明」。
用户正在学习大藏经中的经文。请用简明易懂、充满慈悲的语言解释经文含义。
回答风格：
- 先简述此段核心要义（1-2句）
- 再展开解释字词、典故、修行意义
- 最后以一句禅语或修行建议收尾
- 语言温暖亲切，不要过于学术
- 回答控制在300字以内"""


async def explain_scripture(text: str, context: str = "") -> str:
    if not client.api_key:
        return "Please set DOUBAO_API_KEY to enable AI explanation."
    prompt = f"请解释以下经文：\n\n「{text}」"
    if context:
        prompt += f"\n\n经文出处：{context}"
    resp = await client.chat.completions.create(
        model=MODEL,
        max_tokens=600,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
    )
    return resp.choices[0].message.content


async def ask_question(question: str, scripture_text: str = "") -> str:
    if not client.api_key:
        return "Please set DOUBAO_API_KEY to enable AI Q&A."
    context = f"相关经文：「{scripture_text}」\n\n" if scripture_text else ""
    resp = await client.chat.completions.create(
        model=MODEL,
        max_tokens=600,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"{context}问题：{question}"}
        ]
    )
    return resp.choices[0].message.content
