"""
嘉兴藏经书阅读器 - Flask Web Application
功能：
1. 从嘉兴藏网站获取经书图片
2. 使用豆包Vision AI进行OCR识别
3. 使用豆包AI添加标点符号
4. 点击句子进行语音朗读（浏览器TTS）
5. 点击句子获取AI解释
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import base64
import json
import hashlib
import time
import os
import re
import threading
import queue
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

app = Flask(__name__)
CORS(app)

# Configuration
DOUBAO_API_KEY = "9fb81ccb-ed98-496e-8819-7f6ee7c54abb"
VISION_MODEL = "doubao-1-5-vision-pro-32k-250115"
TEXT_MODEL = "ep-m-20251004070630-khc7f"
ARK_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
JXZ_BASE_URL = "http://jxz-h5.jiaxingzang.com"

# Cache directory
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

# ============ JXZ API Signing ============

def evp_bytes_to_key(password, salt, key_len=32, iv_len=16):
    d = b''
    d_i = b''
    while len(d) < key_len + iv_len:
        d_i = hashlib.md5(d_i + password + salt).digest()
        d += d_i
    return d[:key_len], d[key_len:key_len+iv_len]

def cryptojs_aes_encrypt(message, passphrase):
    salt = os.urandom(8)
    password = passphrase.encode('utf-8') if isinstance(passphrase, str) else passphrase
    message = message.encode('utf-8') if isinstance(message, str) else message
    key, iv = evp_bytes_to_key(password, salt)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted = cipher.encrypt(pad(message, AES.block_size))
    return base64.b64encode(b'Salted__' + salt + encrypted).decode('utf-8')

def get_md5(data_dict):
    json_str = json.dumps(data_dict, separators=(',', ':'))
    return hashlib.md5(json_str.encode('utf-8')).hexdigest()

def jxz_api_post(url_path, data):
    data = dict(data)
    data['timestamp'] = int(time.time() * 1000)
    if 'sign' in data:
        del data['sign']
    md5_str = get_md5(data)
    data['sign'] = cryptojs_aes_encrypt(md5_str, url_path)
    resp = requests.post(
        JXZ_BASE_URL + url_path,
        json=data,
        headers={'x-client': '2', 'Content-Type': 'application/json'},
        timeout=15
    )
    return resp.json()

# ============ Doubao AI ============

def doubao_chat(messages, model=None, max_tokens=4096):
    if model is None:
        model = TEXT_MODEL
    headers = {
        "Authorization": f"Bearer {DOUBAO_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens
    }
    resp = requests.post(ARK_URL, headers=headers, json=data, timeout=180)
    result = resp.json()
    if resp.status_code == 200:
        return result['choices'][0]['message']['content']
    else:
        raise Exception(f"Doubao API error: {result}")

def ocr_image(img_url):
    """OCR a scripture image using Doubao Vision"""
    # Download image
    resp = requests.get(img_url, timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Failed to download image: {resp.status_code}")
    
    img_data = base64.b64encode(resp.content).decode('utf-8')
    
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{img_data}"
                    }
                },
                {
                    "type": "text",
                    "text": "这是一页中国古代佛教经书（嘉兴藏大藏经）的扫描图片，文字是竖排从右到左排列的繁体汉字。\n请完整识别并转录图片中的所有文字内容：\n1. 将竖排文字转为横排\n2. 从右到左、从上到下的顺序转为从左到右\n3. 只输出原文文字，不要添加任何解释或标点\n4. 保持所有汉字的准确性\n5. 如果有页码、函号等信息也请一并转录\n6. 如果图片主要是图案而非文字，请输出[图像页]"
                }
            ]
        }
    ]
    
    return doubao_chat(messages, model=VISION_MODEL, max_tokens=4096)

def add_punctuation(raw_text):
    """Add punctuation to raw scripture text"""
    messages = [
        {
            "role": "system",
            "content": "你是一位精通佛教经典的学者，擅长为古代汉语经文添加标点符号。"
        },
        {
            "role": "user",
            "content": f"""请为以下佛教经文添加标点符号，使其符合现代阅读习惯。
要求：
1. 使用现代标点符号（句号、逗号、顿号、分号等）
2. 保持原文所有汉字不变
3. 只输出添加了标点的原文，不要添加任何解释或注释
4. 按照句子结构合理断句

原文：
{raw_text}"""
        }
    ]
    return doubao_chat(messages, max_tokens=4096)

def explain_text(text):
    """Explain a piece of scripture text"""
    messages = [
        {
            "role": "system",
            "content": "你是一位精通佛教经典的学者，能够用通俗易懂的现代汉语解释古代佛教经文。"
        },
        {
            "role": "user",
            "content": f"""请用通俗易懂的现代汉语解释以下佛教经文的含义：

"{text}"

要求：
1. 先给出字面意思（白话翻译）
2. 再解释深层含义或佛教思想
3. 语言简洁明了，适合普通读者理解
4. 总字数控制在300字以内"""
        }
    ]
    return doubao_chat(messages, max_tokens=1024)

def split_into_sentences(text):
    """Split punctuated text into sentences for display"""
    # Split by sentence-ending punctuation
    sentences = []
    current = ""
    
    for char in text:
        current += char
        if char in '。！？；\n' and current.strip():
            sentences.append(current.strip())
            current = ""
    
    if current.strip():
        sentences.append(current.strip())
    
    # Filter out very short fragments
    sentences = [s for s in sentences if len(s) > 2]
    return sentences

# ============ Cache Functions ============

def get_cache_key(book_id, letter_id, page_num):
    return f"book{book_id}_letter{letter_id}_page{page_num}"

def get_cached_page(book_id, letter_id, page_num):
    cache_file = os.path.join(CACHE_DIR, f"{get_cache_key(book_id, letter_id, page_num)}.json")
    if os.path.exists(cache_file):
        with open(cache_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def save_cached_page(book_id, letter_id, page_num, data):
    cache_file = os.path.join(CACHE_DIR, f"{get_cache_key(book_id, letter_id, page_num)}.json")
    with open(cache_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ============ Background Cache Worker ============

cache_queue = queue.Queue()
cache_status = {}  # key -> 'pending' | 'processing' | 'done' | 'error'
cache_status_lock = threading.Lock()

def cache_worker():
    """Background thread that processes cache jobs one at a time"""
    import logging
    logging.basicConfig(level=logging.INFO)
    log = logging.getLogger('cache_worker')
    log.info("Cache worker started")
    
    while True:
        try:
            job = cache_queue.get(timeout=5)
        except queue.Empty:
            continue
        
        book_id = job['book_id']
        letter_id = job['letter_id']
        page_num = job['page_num']
        key = get_cache_key(book_id, letter_id, page_num)
        
        log.info(f"Processing page: book={book_id} letter={letter_id} page={page_num}")
        
        # Skip if already cached
        if get_cached_page(book_id, letter_id, page_num):
            log.info(f"  -> Already cached, skipping")
            with cache_status_lock:
                cache_status[key] = 'done'
            cache_queue.task_done()
            continue
        
        with cache_status_lock:
            cache_status[key] = 'processing'
        
        try:
            log.info(f"  -> Fetching page info from JXZ API...")
            result = jxz_api_post('/api/book/get-book-page', {
                'book_id': book_id,
                'letter_id': letter_id,
                'pageNum': page_num,
                'pageSize': 1
            })
            if result['code'] != 0:
                raise Exception(result.get('msg', 'API error'))
            
            page_data = result['data']['rows'][0]
            total_pages = result['data']['count']
            img_url = page_data['page_img']
            if img_url.startswith('//'):
                img_url = 'https:' + img_url
            
            log.info(f"  -> OCR image: {img_url[:60]}...")
            raw_text = ocr_image(img_url)
            log.info(f"  -> OCR done, text length: {len(raw_text)}")
            
            if '[图像页]' in raw_text or len(raw_text.strip()) < 10:
                page_result = {
                    'page_num': page_num,
                    'total_pages': total_pages,
                    'img_url': img_url,
                    'raw_text': raw_text,
                    'punctuated_text': raw_text,
                    'sentences': [],
                    'is_image_page': True
                }
                log.info(f"  -> Image page, saved")
            else:
                log.info(f"  -> Adding punctuation...")
                punctuated = add_punctuation(raw_text)
                sentences = split_into_sentences(punctuated)
                page_result = {
                    'page_num': page_num,
                    'total_pages': total_pages,
                    'img_url': img_url,
                    'raw_text': raw_text,
                    'punctuated_text': punctuated,
                    'sentences': sentences,
                    'is_image_page': False
                }
                log.info(f"  -> Done! {len(sentences)} sentences")
            
            save_cached_page(book_id, letter_id, page_num, page_result)
            with cache_status_lock:
                cache_status[key] = 'done'
        
        except Exception as e:
            log.error(f"  -> ERROR: {e}")
            with cache_status_lock:
                cache_status[key] = f'error: {str(e)[:80]}'
        
        cache_queue.task_done()
        time.sleep(2)  # Rate limit: 2s between pages

def ensure_worker_alive():
    """Ensure the cache worker thread is running, restart if dead"""
    global _worker_thread
    if not _worker_thread.is_alive():
        import logging
        logging.getLogger('cache_worker').warning("Worker thread died, restarting...")
        _worker_thread = threading.Thread(target=cache_worker, daemon=False)
        _worker_thread.start()
    return _worker_thread.is_alive()

# Start background worker thread (non-daemon so gunicorn sync worker keeps it alive)
_worker_thread = threading.Thread(target=cache_worker, daemon=False)
_worker_thread.start()
print("Cache worker thread started:", _worker_thread.is_alive())

# ============ Flask Routes ============

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/book-info', methods=['GET'])
def get_book_info():
    """Get book information"""
    book_id = request.args.get('book_id', 20000, type=int)
    try:
        result = jxz_api_post('/api/book/get-book-detail', {'book_id': book_id})
        if result['code'] == 0:
            return jsonify({'success': True, 'data': result['data']})
        else:
            return jsonify({'success': False, 'error': result.get('msg', 'Unknown error')})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# In-progress processing jobs: key -> threading.Event + result dict
_processing_jobs = {}
_processing_lock = threading.Lock()

def process_page_job(book_id, letter_id, page_num, event, result_holder):
    """Process a page in a background thread and signal when done"""
    try:
        result = jxz_api_post('/api/book/get-book-page', {
            'book_id': book_id,
            'letter_id': letter_id,
            'pageNum': page_num,
            'pageSize': 1
        })
        if result['code'] != 0:
            result_holder['error'] = result.get('msg', 'API error')
            return
        
        page_data = result['data']['rows'][0]
        total_pages = result['data']['count']
        img_url = page_data['page_img']
        if img_url.startswith('//'):
            img_url = 'https:' + img_url
        
        raw_text = ocr_image(img_url)
        
        if '[图像页]' in raw_text or len(raw_text.strip()) < 10:
            page_result = {
                'page_num': page_num,
                'total_pages': total_pages,
                'img_url': img_url,
                'raw_text': raw_text,
                'punctuated_text': raw_text,
                'sentences': [],
                'is_image_page': True
            }
        else:
            punctuated = add_punctuation(raw_text)
            sentences = split_into_sentences(punctuated)
            page_result = {
                'page_num': page_num,
                'total_pages': total_pages,
                'img_url': img_url,
                'raw_text': raw_text,
                'punctuated_text': punctuated,
                'sentences': sentences,
                'is_image_page': False
            }
        
        save_cached_page(book_id, letter_id, page_num, page_result)
        result_holder['data'] = page_result
    except Exception as e:
        import traceback
        result_holder['error'] = str(e)
        result_holder['traceback'] = traceback.format_exc()
    finally:
        event.set()
        key = get_cache_key(book_id, letter_id, page_num)
        with _processing_lock:
            _processing_jobs.pop(key, None)

@app.route('/api/page', methods=['GET'])
def get_page():
    """Get a page of scripture - OCR and add punctuation"""
    book_id = request.args.get('book_id', 20000, type=int)
    letter_id = request.args.get('letter_id', 1, type=int)
    page_num = request.args.get('page_num', 1, type=int)
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    # Check cache first
    if not force_refresh:
        cached = get_cached_page(book_id, letter_id, page_num)
        if cached:
            return jsonify({'success': True, 'data': cached, 'cached': True})
    
    key = get_cache_key(book_id, letter_id, page_num)
    
    # Check if already being processed
    with _processing_lock:
        if key in _processing_jobs:
            event, result_holder = _processing_jobs[key]
        else:
            event = threading.Event()
            result_holder = {}
            _processing_jobs[key] = (event, result_holder)
            t = threading.Thread(target=process_page_job, args=(book_id, letter_id, page_num, event, result_holder), daemon=True)
            t.start()
    
    # Wait up to 240 seconds for the result
    finished = event.wait(timeout=240)
    
    if not finished:
        return jsonify({'success': False, 'error': 'AI处理超时，请稍后重试（页面正在后台继续处理）'})
    
    if 'error' in result_holder:
        return jsonify({'success': False, 'error': result_holder['error']})
    
    return jsonify({'success': True, 'data': result_holder['data'], 'cached': False})

@app.route('/api/explain', methods=['POST'])
def explain():
    """Explain a piece of text"""
    data = request.get_json()
    text = data.get('text', '')
    
    if not text:
        return jsonify({'success': False, 'error': 'No text provided'})
    
    try:
        explanation = explain_text(text)
        return jsonify({'success': True, 'explanation': explanation})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/books', methods=['GET'])
def get_books():
    """Get list of all books (箱)"""
    try:
        result = jxz_api_post('/api/book/get-book-list', {'pageNum': 1, 'pageSize': 100})
        if result['code'] == 0:
            books = result['data']['rows']
            return jsonify({'success': True, 'books': books})
        else:
            return jsonify({'success': False, 'error': result.get('msg')})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/letters', methods=['GET'])
def get_letters():
    """Get list of letters (函) for a book"""
    book_id = request.args.get('book_id', 20000, type=int)
    try:
        # Get book info to know total letters
        result = jxz_api_post('/api/book/get-book-detail', {'book_id': book_id})
        if result['code'] == 0:
            book = result['data']
            letters = []
            for i in range(1, book['book_letter'] + 1):
                letters.append({'id': i, 'name': f'第{i}函'})
            return jsonify({'success': True, 'letters': letters, 'book': book})
        else:
            return jsonify({'success': False, 'error': result.get('msg')})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/cache/start', methods=['POST'])
def start_cache():
    """Start background caching for a letter (函)"""
    # Ensure worker is alive before starting
    ensure_worker_alive()
    
    data = request.get_json()
    book_id = data.get('book_id', 20000)
    letter_id = data.get('letter_id', 1)
    total_pages = data.get('total_pages', 0)
    start_page = data.get('start_page', 1)
    
    if total_pages <= 0:
        return jsonify({'success': False, 'error': 'total_pages required'})
    
    queued = 0
    skipped = 0
    for page_num in range(start_page, total_pages + 1):
        key = get_cache_key(book_id, letter_id, page_num)
        # Skip if already cached or already queued
        if get_cached_page(book_id, letter_id, page_num):
            skipped += 1
            continue
        with cache_status_lock:
            if cache_status.get(key) in ('pending', 'processing', 'done'):
                skipped += 1
                continue
            cache_status[key] = 'pending'
        cache_queue.put({'book_id': book_id, 'letter_id': letter_id, 'page_num': page_num})
        queued += 1
    
    return jsonify({
        'success': True,
        'queued': queued,
        'skipped': skipped,
        'queue_size': cache_queue.qsize()
    })

@app.route('/api/cache/status', methods=['GET'])
def cache_status_api():
    """Get cache status for a letter"""
    book_id = request.args.get('book_id', 20000, type=int)
    letter_id = request.args.get('letter_id', 1, type=int)
    total_pages = request.args.get('total_pages', 0, type=int)
    
    # Auto-restart worker if dead and there are pending jobs
    if not _worker_thread.is_alive() and cache_queue.qsize() > 0:
        ensure_worker_alive()
    
    result = {
        'queue_size': cache_queue.qsize(),
        'worker_alive': _worker_thread.is_alive(),
        'pages': {}
    }
    
    for page_num in range(1, total_pages + 1):
        key = get_cache_key(book_id, letter_id, page_num)
        if get_cached_page(book_id, letter_id, page_num):
            result['pages'][page_num] = 'done'
        else:
            with cache_status_lock:
                result['pages'][page_num] = cache_status.get(key, 'none')
    
    done_count = sum(1 for v in result['pages'].values() if v == 'done')
    result['done'] = done_count
    result['total'] = total_pages
    result['percent'] = round(done_count / total_pages * 100) if total_pages > 0 else 0
    
    return jsonify(result)

@app.route('/api/cache/stop', methods=['POST'])
def stop_cache():
    """Clear the cache queue"""
    cleared = 0
    while not cache_queue.empty():
        try:
            job = cache_queue.get_nowait()
            key = get_cache_key(job['book_id'], job['letter_id'], job['page_num'])
            with cache_status_lock:
                if cache_status.get(key) == 'pending':
                    cache_status[key] = 'none'
            cache_queue.task_done()
            cleared += 1
        except queue.Empty:
            break
    return jsonify({'success': True, 'cleared': cleared})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
