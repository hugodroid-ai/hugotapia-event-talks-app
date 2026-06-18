import os
import json
import time
import urllib.request
import xml.etree.ElementTree as ET
import re
from flask import Flask, jsonify, render_template

app = Flask(__name__)

CACHE_FILE = 'cache.json'
CACHE_EXPIRY = 3600  # 1 hour cache expiry in seconds
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_html_content(content):
    """
    Splits the HTML content of a single release date entry by <h3> tags.
    This groups updates by type (e.g. Feature, Deprecated, Fix).
    """
    # Split content by <h3> (case-insensitive)
    parts = re.split(r'(?i)<h3>', content)
    items = []
    
    if len(parts) == 1:
        text = parts[0].strip()
        if text:
            items.append({
                'type': 'General',
                'body': text
            })
        return items
        
    initial_text = parts[0].strip()
    if initial_text:
        # Check if there is actual content after stripping tags
        plain = re.sub(r'<[^>]*>', '', initial_text).strip()
        if plain:
            items.append({
                'type': 'General',
                'body': initial_text
            })
            
    for part in parts[1:]:
        subparts = part.split('</h3>', 1)
        if len(subparts) == 2:
            h3_type = subparts[0].strip()
            body = subparts[1].strip()
            items.append({
                'type': h3_type,
                'body': body
            })
        else:
            items.append({
                'type': 'Update',
                'body': part.strip()
            })
    return items

def fetch_and_parse_feed():
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        releases = []
        item_id_counter = 0
        
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            date_str = title.text if title is not None else "Unknown Date"
            
            id_elem = entry.find('atom:id', ns)
            id_val = id_elem.text if id_elem is not None else ""
            
            updated_elem = entry.find('atom:updated', ns)
            updated_iso = updated_elem.text if updated_elem is not None else ""
            
            # Link
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            link = link_elem.attrib.get('href') if link_elem is not None else ""
            if not link:
                link_elem = entry.find("atom:link", ns)
                link = link_elem.attrib.get('href') if link_elem is not None else ""
                
            content_elem = entry.find('atom:content', ns)
            content = content_elem.text if content_elem is not None else ""
            
            parsed_items = parse_html_content(content)
            
            # Attach a unique ID to each split item
            structured_items = []
            for item in parsed_items:
                structured_items.append({
                    'id': f"item-{item_id_counter}",
                    'type': item['type'],
                    'body': item['body']
                })
                item_id_counter += 1
                
            releases.append({
                'date': date_str,
                'updated_iso': updated_iso,
                'link': link,
                'id': id_val,
                'items': structured_items
            })
            
        data = {
            'updated_at': time.time(),
            'releases': releases
        }
        
        # Save to cache file
        with open(CACHE_FILE, 'w') as f:
            json.dump(data, f)
            
        return data, None
    except Exception as e:
        return None, str(e)

def get_releases(force_refresh=False):
    # Try reading cache first
    cache_exists = os.path.exists(CACHE_FILE)
    if cache_exists and not force_refresh:
        try:
            with open(CACHE_FILE, 'r') as f:
                data = json.load(f)
            # Check expiry
            if time.time() - data.get('updated_at', 0) < CACHE_EXPIRY:
                return data, None
        except Exception:
            pass # ignore cache parse error, fetch fresh
            
    # Fetch fresh
    data, error = fetch_and_parse_feed()
    if data:
        return data, None
        
    # If fresh fetch failed but cache exists, fallback to cache even if expired
    if cache_exists:
        try:
            with open(CACHE_FILE, 'r') as f:
                data = json.load(f)
            # Annotate that it's stale data
            data['stale'] = True
            data['error'] = error
            return data, None
        except Exception:
            pass
            
    return None, error

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    data, error = get_releases(force_refresh=False)
    if error and not data:
        return jsonify({'error': error}), 500
    return jsonify(data)

@app.route('/api/releases/refresh')
def api_refresh():
    data, error = get_releases(force_refresh=True)
    if error and not data:
        return jsonify({'error': error}), 500
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
