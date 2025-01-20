// Configuration
const API_KEY = 'sk-fdf5a81cb9a047d089a1402b7a30dc3c';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// DOM Elements
const englishNameInput = document.getElementById('englishName');
const generateBtn = document.getElementById('generateBtn');
const resultsContainer = document.getElementById('results');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const tryAgainBtn = document.getElementById('tryAgainBtn');
const sidebar = document.getElementById('paymentSidebar');
const donateBtn = document.getElementById('donateBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Name generation events
    generateBtn.addEventListener('click', generateNames);
    tryAgainBtn.addEventListener('click', generateNames);
    englishNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateNames();
        }
    });

    // Sidebar events
    donateBtn.addEventListener('click', toggleSidebar);
    document.addEventListener('click', closeSidebarOnClickOutside);
});

// Sidebar Functions
function toggleSidebar(e) {
    e.stopPropagation();
    sidebar.classList.toggle('active');
}

function closeSidebarOnClickOutside(e) {
    if (!sidebar.contains(e.target) && !donateBtn.contains(e.target)) {
        sidebar.classList.remove('active');
    }
}

// Main Function
async function generateNames() {
    const englishName = englishNameInput.value.trim();
    
    if (!englishName) {
        showError('Please enter your English name.');
        return;
    }

    try {
        showLoading(true);
        hideError();
        clearResults();
        
        // Try multiple times with exponential backoff
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const names = await callDeepSeekAPI(englishName);
                displayResults(names);
                return;
            } catch (error) {
                console.log(`Attempt ${attempt} failed:`, error);
                if (attempt === MAX_RETRIES) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt - 1)));
            }
        }
    } catch (error) {
        console.error('Error generating names:', error);
        showError('Failed to generate names. Please try again.');
    } finally {
        showLoading(false);
    }
}

// API Functions
async function callDeepSeekAPI(englishName) {
    const systemPrompt = `You are a creative Chinese name generator that specializes in creating funny and memorable names. You always respond in the exact JSON format requested.`;
    
    const userPrompt = `Create 3 funny Chinese names for "${englishName}" that:
1. Use internet slang or memes (like 真香, 奥利给)
2. Sound similar to "${englishName}"
3. Include pop culture references
4. Are easy to pronounce and remember

Format the response exactly like this:
{
    "names": [
        {
            "chinese_name": "2-3 Chinese characters",
            "pinyin": "Pinyin with tones",
            "meaning": "Meaning of each character",
            "cultural_explanation": "Why it's funny or memorable",
            "personality_traits": ["3 traits"],
            "english_explanation": "English explanation"
        }
    ]
}`;

    try {
        console.log('Calling DeepSeek API...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        "role": "system",
                        "content": systemPrompt
                    },
                    {
                        "role": "user",
                        "content": userPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 800,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('Invalid API response format');
        }

        let content;
        try {
            content = JSON.parse(data.choices[0].message.content);
        } catch (e) {
            console.error('Failed to parse API response:', e);
            throw new Error('Invalid response format from API');
        }

        if (!content.names || !Array.isArray(content.names) || content.names.length === 0) {
            throw new Error('No names generated');
        }

        return content.names;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// UI Functions
function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
}

function showError(message) {
    errorText.innerHTML = `<p><i class="fas fa-exclamation-circle"></i> ${message}</p>`;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function clearResults() {
    resultsContainer.innerHTML = '';
}

function displayResults(names) {
    clearResults();
    
    names.forEach((name, index) => {
        const nameOption = document.createElement('div');
        nameOption.className = 'name-option';
        nameOption.innerHTML = `
            <div class="name-content">
                <div class="chinese-name">
                    <h3>${name.chinese_name}</h3>
                    <p class="pinyin">${name.pinyin}</p>
                </div>

                <div class="name-details">
                    <div class="detail-section">
                        <h4><i class="fas fa-font"></i> Character Meaning</h4>
                        <p>${name.meaning}</p>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-comment-alt"></i> Cultural Background</h4>
                        <p>${name.cultural_explanation}</p>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-user"></i> Personality Traits</h4>
                        <ul>
                            ${name.personality_traits.map(trait => `<li>${trait}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-language"></i> English Meaning</h4>
                        <p>${name.english_explanation}</p>
                    </div>
                </div>

                <div class="name-actions">
                    <button class="action-btn favorite-btn" title="Add to Favorites">
                        <i class="far fa-heart"></i>
                        <span>Favorite</span>
                    </button>
                    <button class="action-btn share-btn" title="Share Name">
                        <i class="fas fa-share-alt"></i>
                        <span>Share</span>
                    </button>
                </div>
            </div>
        `;
        resultsContainer.appendChild(nameOption);
    });
}

// Action Functions
function toggleFavorite(btn) {
    const icon = btn.querySelector('i');
    if (icon.classList.contains('far')) {
        icon.classList.replace('far', 'fas');
        btn.title = 'Remove from Favorites';
    } else {
        icon.classList.replace('fas', 'far');
        btn.title = 'Add to Favorites';
    }
}

function shareName(nameOption) {
    const chineseName = nameOption.querySelector('.chinese-name h3').textContent;
    const pinyin = nameOption.querySelector('.pinyin').textContent;
    
    const shareText = `Check out my Chinese name: ${chineseName} (${pinyin})`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My Chinese Name',
            text: shareText,
            url: window.location.href
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(shareText)
            .then(() => alert('Name copied to clipboard!'))
            .catch(console.error);
    }
}

// Event Listeners for Actions
document.addEventListener('click', (e) => {
    const favoriteBtn = e.target.closest('.favorite-btn');
    if (favoriteBtn) {
        toggleFavorite(favoriteBtn);
    }

    const shareBtn = e.target.closest('.share-btn');
    if (shareBtn) {
        shareName(shareBtn.closest('.name-option'));
    }
});
