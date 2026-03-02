# 嘉兴藏大藏经阅读器

一款智能化的佛教经典阅读工具，将古代经书扫描图片转换为现代可读格式。

## 功能特色

- 📖 **智能OCR**：使用豆包Vision AI识别古代经书扫描图片中的繁体汉字
- ✍️ **自动标点**：AI自动为无标点古文添加现代标点符号
- 🔊 **语音朗读**：单击任意句子即可语音朗读（浏览器TTS）
- 🤖 **AI解义**：双击句子获取豆包AI的详细解释（字面意思+佛教深层含义）
- 💾 **智能缓存**：已处理页面自动缓存，下次访问秒开

## 技术栈

- **后端**：Python Flask
- **AI**：豆包大模型（doubao-1-5-vision-pro-32k-250115 + doubao-seed-1-6-flash）
- **前端**：原生HTML/CSS/JS，楷体字体，古典风格UI
- **部署**：Render.com

## 本地运行

```bash
pip install -r requirements.txt
python app.py
```

访问 http://localhost:5000

## 环境变量

在 Render 上需要设置：
- `DOUBAO_API_KEY`：豆包API密钥
