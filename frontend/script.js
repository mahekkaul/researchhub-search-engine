// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsContainer = document.getElementById('results-container');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const sourceRadios = document.getElementsByName('source');

// API URL (adjust this URL based on your setup)
const API_BASE_URL = 'http://localhost:5000/api/search';

// Event Listeners
searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
});

// Initial setup
document.addEventListener('DOMContentLoaded', function() {
    // Focus on search input when page loads
    searchInput.focus();
    
    // Add connection test message
    console.log("Checking connection to backend server...");
    checkBackendConnection();
});

// Functions
function checkBackendConnection() {
    fetch(`${API_BASE_URL}?query=test&source=arxiv`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Backend connection test failed');
            }
            console.log("Backend connection successful!");
        })
        .catch(error => {
            console.error('Backend connection error:', error);
            showError("Cannot connect to the backend server. Make sure the Python Flask server is running at http://localhost:5000");
        });
}

function performSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        showError('Please enter a search term');
        return;
    }
    
    // Get selected source
    let selectedSource = 'arxiv';
    for (const radio of sourceRadios) {
        if (radio.checked) {
            selectedSource = radio.value;
            break;
        }
    }
    
    // Clear previous results and errors
    clearResults();
    hideError();
    
    // Show loading spinner
    showLoading();
    
    // Build URL with query parameters
    const url = `${API_BASE_URL}?query=${encodeURIComponent(query)}&source=${selectedSource}`;
    console.log("Sending request to:", url);
    
    // Fetch results from API
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok (${response.status})`);
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            console.log("Received data:", data);
            
            if (!data.results || data.results.length === 0) {
                showError(`No results found for "${query}"`);
                return;
            }
            
            displayResults(data.results);
        })
        .catch(error => {
            hideLoading();
            showError(`Error fetching results: ${error.message}`);
            console.error('Search error:', error);
        });
}

function displayResults(results) {
    if (!results || results.length === 0) {
        return;
    }
    
    results.forEach(paper => {
        const paperCard = document.createElement('div');
        paperCard.className = 'paper-card';
        
        // Format authors list with fallback for missing data
        const authors = paper.authors || [];
        const authorsList = authors.length > 3 
            ? authors.slice(0, 3).join(', ') + ', et al.' 
            : authors.join(', ');
        
        paperCard.innerHTML = `
            <h2 class="paper-title">
                <a href="${paper.link}" target="_blank">${paper.title}</a>
            </h2>
            <div class="paper-meta">
                <span><i class="far fa-calendar-alt"></i> ${paper.published || 'No date'}</span>
                <span><i class="fas fa-database"></i> ${paper.source}</span>
            </div>
            <p class="paper-summary">${paper.summary || 'No summary available'}</p>
            <p class="paper-authors"><i class="fas fa-users"></i> ${authorsList || 'Unknown authors'}</p>
            <a href="${paper.link}" class="paper-link" target="_blank">Read Paper</a>
            <span class="paper-source">${paper.source}</span>
        `;
        
        resultsContainer.appendChild(paperCard);
    });
    
    // Add animation effects
    addAnimationEffects();
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearResults() {
    resultsContainer.innerHTML = '';
}

function showLoading() {
    loadingSpinner.style.display = 'flex';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Add animation effects for search results
function addAnimationEffects() {
    // Add a small delay between each card appearing
    const cards = document.querySelectorAll('.paper-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });
}