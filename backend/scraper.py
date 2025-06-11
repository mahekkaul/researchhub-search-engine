from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup
import re
try:
    from flask_cors import CORS
except ImportError:
    print("flask_cors not installed. Running without CORS support.")
    # Simple CORS implementation if package is missing
    class CORS:
        def __init__(self, app=None):
            if app:
                self.init_app(app)
        
        def init_app(self, app):
            @app.after_request
            def add_cors_headers(response):
                response.headers['Access-Control-Allow-Origin'] = '*'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
                return response

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/search', methods=['GET'])
def search_papers():
    query = request.args.get('query', '')
    source = request.args.get('source', 'arxiv')  # Default to arXiv
    
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400
    
    if source == 'arxiv':
        return search_arxiv(query)
    elif source == 'biorxiv':
        return search_biorxiv(query)
    else:
        return jsonify({"error": "Invalid source"}), 400

def search_arxiv(query):
    # Format query for arXiv API
    formatted_query = query.replace(' ', '+')
    url = f"https://export.arxiv.org/api/query?search_query=all:{formatted_query}&start=0&max_results=10"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'xml')
        entries = soup.find_all('entry')
        
        results = []
        for entry in entries:
            title = entry.title.text.strip()
            summary = entry.summary.text.strip()
            authors = [author.find('name').text for author in entry.find_all('author')]
            published = entry.published.text[:10]  # Just the date part
            link_elem = entry.find('link', {'rel': 'alternate'})
            link = link_elem.get('href') if link_elem else "#"
            
            results.append({
                "title": title,
                "summary": summary[:300] + '...' if len(summary) > 300 else summary,
                "authors": authors,
                "published": published,
                "link": link,
                "source": "arXiv"
            })
        
        return jsonify({"results": results})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def search_biorxiv(query):
    # bioRxiv search
    formatted_query = query.replace(' ', '%20')
    url = f"https://www.biorxiv.org/search/{formatted_query}"
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        articles = soup.select('.highwire-article-citation')
        
        results = []
        for article in articles[:10]:  # Limit to 10 results
            title_elem = article.select_one('.highwire-cite-title')
            title = title_elem.text.strip() if title_elem else "No title available"
            
            link_elem = title_elem.find('a') if title_elem else None
            link = "https://www.biorxiv.org" + link_elem['href'] if link_elem and link_elem.has_attr('href') else "#"
            
            authors_elem = article.select_one('.highwire-citation-authors')
            authors = [a.text.strip() for a in authors_elem.select('.highwire-citation-author')] if authors_elem else []
            
            date_elem = article.select_one('.highwire-cite-metadata-date')
            published = date_elem.text.strip() if date_elem else "No date available"
            
            abstract_elem = article.select_one('.highwire-cite-snippet')
            summary = abstract_elem.text.strip() if abstract_elem else "No abstract available"
            
            results.append({
                "title": title,
                "summary": summary[:300] + '...' if len(summary) > 300 else summary,
                "authors": authors,
                "published": published,
                "link": link,
                "source": "bioRxiv"
            })
            
        return jsonify({"results": results})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting ResearchHub backend server...")
    print("Server will be available at http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    app.run(debug=True, port=5000)