// Helper function to fix image URLs
function fixImagePath(imageUrl) {
    if (!imageUrl) return '';
    
    // Debug the incoming URL
    console.log("Fixing image path for:", imageUrl);
    
    // If it's a data URL, return as is
    if (imageUrl.startsWith('data:')) {
        return imageUrl;
    }
    
    // Fix common URL issues:
    
    // Issue 1: /temp_images/ instead of /images/
    if (imageUrl.includes('/temp_images/')) {
        imageUrl = imageUrl.replace('/temp_images/', '/images/');
        console.log("Fixed temp_images path to:", imageUrl);
    }
    
    // Issue 2: Sometimes the server hostname might be included
    if (imageUrl.includes('localhost:8000')) {
        // Extract just the path portion
        const urlObj = new URL(imageUrl);
        imageUrl = urlObj.pathname;
        console.log("Extracted path from full URL:", imageUrl);
    }
    
    // Issue 3: Missing leading slash
    if (!imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
        imageUrl = '/' + imageUrl;
        console.log("Added leading slash:", imageUrl);
    }
    
    // For file:// protocol, we need to use absolute URLs
    if (window.location.protocol === 'file:') {
        imageUrl = 'http://localhost:8000' + imageUrl;
        console.log("Added server prefix for file protocol:", imageUrl);
    }
    
    return imageUrl;
}

document.addEventListener('DOMContentLoaded', function() {
    // Get the base URL for API calls
    const API_BASE_URL = getApiBaseUrl();
    console.log("Using API base URL:", API_BASE_URL);

    // Initialize tab navigation
    initTabNavigation();
    
    // Initialize form handlers
    initImageGeneration();
    initImageEditing();
    initChatWithImage();
    initHistoryView();
    
    // Initialize modal functionality
    initModal();
    
    // Load history on page load
    loadHistory();
    
    // Log that the frontend is loaded properly
    console.log("Frontend loaded successfully!");
});

// Function to determine the base URL for API calls
function getApiBaseUrl() {
    // If the page is served from the FastAPI server, use relative URLs
    if (window.location.protocol !== 'file:') {
        return '';
    }
    
    // For local file access, use explicit localhost URL
    return 'http://localhost:8000';
}

// Tab Navigation
function initTabNavigation() {
    const tabLinks = document.querySelectorAll('nav a');
    const historyTabButtons = document.querySelectorAll('.tab-btn[data-history-tab]');
    
    // Main tabs
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs
            tabLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // History subtabs
    historyTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            historyTabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.history-tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            const tabId = this.getAttribute('data-history-tab');
            document.getElementById(`${tabId}-history`).classList.add('active');
        });
    });
}

// Image Generation
function initImageGeneration() {
    const generateForm = document.getElementById('generate-form');
    const resultContainer = document.getElementById('generate-result');
    const loader = resultContainer.querySelector('.loader');
    const resultContent = resultContainer.querySelector('.result-content');
    const generatedImage = document.getElementById('generated-image');
    const generatedText = document.getElementById('generated-text');
    
    // Handle chat about generated image
    document.getElementById('chat-about-generated').addEventListener('click', function() {
        // Switch to chat tab and set the current image
        document.querySelector('nav a[data-tab="chat"]').click();
        
        // Set the image in the chat tab
        const imgSrc = document.getElementById('generated-image').src;
        const chatImagePreview = document.getElementById('chat-image-preview');
        chatImagePreview.innerHTML = `<img src="${imgSrc}" alt="Chat Image">`;
        chatImagePreview.dataset.imageUrl = imgSrc;
    });
    
    // Handle edit generated image
    document.getElementById('edit-generated').addEventListener('click', function() {
        // Switch to edit tab
        document.querySelector('nav a[data-tab="edit"]').click();
        
        // Convert the generated image to a File object
        fetch(document.getElementById('generated-image').src)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], "generated-image.png", {type: "image/png"});
                
                // Create a new DataTransfer object
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                
                // Set the file to the input
                const fileInput = document.getElementById('edit-image-upload');
                fileInput.files = dataTransfer.files;
                
                // Trigger change event
                const event = new Event('change');
                fileInput.dispatchEvent(event);
            });
    });
    
    // Handle download generated image
    document.getElementById('download-generated').addEventListener('click', function() {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = document.getElementById('generated-image').src;
        link.download = 'generated-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Handle form submission
    generateForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const prompt = document.getElementById('generate-prompt').value.trim();
        if (!prompt) {
            alert('Please enter a prompt');
            return;
        }
        
        // Show loader, hide result
        loader.style.display = 'block';
        resultContent.style.display = 'none';
        
        // Create form data
        const formData = new FormData();
        formData.append('prompt', prompt);
        
        // Send request to server with absolute URL
        fetch(getApiBaseUrl() + '/generate-image/', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("Original image URL from server:", data.image_url);
                // Fix the image path
                const correctedImageUrl = fixImagePath(data.image_url);
                
                // Use the corrected URL
                generatedImage.src = correctedImageUrl;
                generatedImage.setAttribute('data-original-url', data.image_url);
                generatedText.textContent = data.message;
                
                // Hide loader, show result
                loader.style.display = 'none';
                resultContent.style.display = 'block';
                
                // Refresh history after generating a new image
                loadHistory();
            } else {
                alert('Error: ' + data.message);
                loader.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
            loader.style.display = 'none';
        });
    });
}

// Image Editing
function initImageEditing() {
    const editForm = document.getElementById('edit-form');
    const imageUpload = document.getElementById('edit-image-upload');
    const imagePreview = document.getElementById('edit-image-preview');
    const resultContainer = document.getElementById('edit-result');
    const loader = resultContainer.querySelector('.loader');
    const resultContent = resultContainer.querySelector('.result-content');
    const editedImage = document.getElementById('edited-image');
    const editedText = document.getElementById('edited-text');
    
    // Handle file upload preview
    imageUpload.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Image to Edit">`;
            };
            
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Handle chat about edited image
    document.getElementById('chat-about-edited').addEventListener('click', function() {
        // Switch to chat tab and set the current image
        document.querySelector('nav a[data-tab="chat"]').click();
        
        // Set the image in the chat tab
        const imgSrc = document.getElementById('edited-image').src;
        const chatImagePreview = document.getElementById('chat-image-preview');
        chatImagePreview.innerHTML = `<img src="${imgSrc}" alt="Chat Image">`;
        chatImagePreview.dataset.imageUrl = imgSrc;
    });
    
    // Handle download edited image
    document.getElementById('download-edited').addEventListener('click', function() {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = document.getElementById('edited-image').src;
        link.download = 'edited-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Handle form submission
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const prompt = document.getElementById('edit-prompt').value.trim();
        const imageFile = imageUpload.files[0];
        
        if (!prompt) {
            alert('Please enter editing instructions');
            return;
        }
        
        if (!imageFile) {
            alert('Please upload an image to edit');
            return;
        }
        
        // Show loader, hide result
        loader.style.display = 'block';
        resultContent.style.display = 'none';
        
        // Create form data
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('image', imageFile);
        
        // Send request to server with absolute URL
        fetch(getApiBaseUrl() + '/edit-image/', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("Original edited image URL:", data.image_url);
                // Fix the image path
                const correctedImageUrl = fixImagePath(data.image_url);
                
                // Use the corrected URL
                editedImage.src = correctedImageUrl;
                editedImage.setAttribute('data-original-url', data.image_url);
                editedText.textContent = data.message;
                
                // Hide loader, show result
                loader.style.display = 'none';
                resultContent.style.display = 'block';
                
                // Refresh history after editing an image
                loadHistory();
            } else {
                alert('Error: ' + data.message);
                loader.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
            loader.style.display = 'none';
        });
    });
}

// Chat with Image
function initChatWithImage() {
    const chatImagePreview = document.getElementById('chat-image-preview');
    const chatImageUpload = document.getElementById('chat-image-upload');
    const chatMessages = document.getElementById('chat-messages');
    const chatPrompt = document.getElementById('chat-prompt');
    const sendChatBtn = document.getElementById('send-chat');
    const selectFromHistoryBtn = document.getElementById('chat-select-from-history');
    const uploadBtn = document.getElementById('chat-upload-btn');
    
    // Handle file upload preview
    chatImageUpload.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                chatImagePreview.innerHTML = `<img src="${e.target.result}" alt="Chat Image">`;
                
                // Clear previous chat messages when new image is selected
                chatMessages.innerHTML = '<div class="empty-state">Image ready. Start chatting!</div>';
                
                // Store the image as a data URL for later use
                chatImagePreview.dataset.imageUrl = e.target.result;
            };
            
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Handle upload button click
    uploadBtn.addEventListener('click', function() {
        chatImageUpload.click();
    });
    
    // Handle select from history button click
    selectFromHistoryBtn.addEventListener('click', function() {
        // Switch to history tab
        document.querySelector('nav a[data-tab="history"]').click();
        document.querySelector('.tab-btn[data-history-tab="images"]').click();
        
        // Add a notification to instruct the user
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = 'Click on an image to select it for chat';
        notification.style.padding = '10px';
        notification.style.backgroundColor = '#ffc107';
        notification.style.borderRadius = '4px';
        notification.style.marginBottom = '16px';
        notification.style.textAlign = 'center';
        
        const historyImagesGrid = document.getElementById('history-images-grid');
        historyImagesGrid.parentNode.insertBefore(notification, historyImagesGrid);
        
        // Add a data attribute to indicate we're in selection mode
        historyImagesGrid.dataset.selectionMode = 'chat';
        
        // Automatically remove the notification after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    });
    
    // Handle send button click
    sendChatBtn.addEventListener('click', sendChatMessage);
    
    // Handle enter key press in chat prompt
    chatPrompt.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    // Function to send chat message
    function sendChatMessage() {
        const prompt = chatPrompt.value.trim();
        let imageUrl = chatImagePreview.dataset.imageUrl;
        
        // Make sure the image URL is correct
        imageUrl = fixImagePath(imageUrl);
        
        if (!prompt) {
            alert('Please enter a message');
            return;
        }
        
        if (!imageUrl) {
            alert('Please select an image first');
            return;
        }
        
        // Clear input
        chatPrompt.value = '';
        
        // Add user message to chat
        addMessage(prompt, 'user');
        
        // Show loading indicator
        const loadingElement = document.createElement('div');
        loadingElement.className = 'message ai-message loading';
        loadingElement.textContent = 'Thinking...';
        chatMessages.appendChild(loadingElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Create form data
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('image_url', imageUrl);
        
        // Send request to server with absolute URL
        fetch(getApiBaseUrl() + '/chat-with-image/', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Remove loading indicator
            chatMessages.removeChild(loadingElement);
            
            if (data.success) {
                // Add AI response to chat
                addMessage(data.message, 'ai');
            } else {
                addMessage('Error: ' + data.message, 'ai');
            }
            
            // Refresh history after adding a new chat message
            loadHistory();
        })
        .catch(error => {
            // Remove loading indicator
            chatMessages.removeChild(loadingElement);
            
            console.error('Error:', error);
            addMessage('An error occurred. Please try again.', 'ai');
        });
    }
    
    // Function to add message to chat
    function addMessage(text, sender) {
        // Clear empty state if present
        if (chatMessages.querySelector('.empty-state')) {
            chatMessages.innerHTML = '';
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}-message`;
        messageElement.textContent = text;
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// History View
function initHistoryView() {
    const refreshHistoryBtn = document.getElementById('refresh-history');
    
    // Handle refresh button click
    refreshHistoryBtn.addEventListener('click', loadHistory);
}

// Load history from server
function loadHistory() {
    fetch(getApiBaseUrl() + '/get-full-history')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Process the comprehensive history data
                const fullHistory = data.history || [];
                
                // Populate image history
                const imagesGrid = document.getElementById('history-images-grid');
                imagesGrid.innerHTML = '';
                
                const imageEntries = fullHistory.filter(entry => 
                    entry.type === 'generate' || entry.type === 'edit'
                );
                
                if (imageEntries.length === 0) {
                    imagesGrid.innerHTML = '<div class="empty-state">No images generated yet</div>';
                } else {
                    imageEntries.forEach(entry => {
                        const card = document.createElement('div');
                        card.className = 'image-card';
                        
                        const img = document.createElement('img');
                        const fixedImagePath = fixImagePath(entry.image_path);
                        console.log("History image path:", entry.image_path, "Fixed:", fixedImagePath);
                        img.src = fixedImagePath;
                        img.alt = 'Generated Image';
                        img.onerror = function() {
                            console.error("Failed to load image:", fixedImagePath);
                            this.src = '/static/image-error.png'; // Fallback image
                        };
                        
                        const info = document.createElement('div');
                        info.className = 'image-info';
                        
                        const prompt = document.createElement('div');
                        prompt.className = 'prompt-text';
                        prompt.textContent = entry.prompt.length > 50 ? 
                                            entry.prompt.substring(0, 50) + '...' : 
                                            entry.prompt;
                        
                        const timestamp = document.createElement('div');
                        timestamp.className = 'timestamp';
                        const date = new Date(entry.created_at * 1000);
                        timestamp.textContent = date.toLocaleString();
                        
                        info.appendChild(prompt);
                        info.appendChild(timestamp);
                        card.appendChild(img);
                        card.appendChild(info);
                        
                        // Store image data as attributes for modal
                        card.dataset.imageUrl = fixedImagePath;
                        card.dataset.originalUrl = entry.image_path;
                        card.dataset.prompt = entry.prompt;
                        card.dataset.responseText = entry.response_text;
                        card.dataset.timestamp = entry.timestamp;
                        card.dataset.type = entry.type;
                        if (entry.input_image_path) {
                            card.dataset.inputImagePath = entry.input_image_path;
                        }
                        
                        // Add click event
                        card.addEventListener('click', function() {
                            const historyImagesGrid = document.getElementById('history-images-grid');
                            
                            // Check if we're in selection mode
                            if (historyImagesGrid.dataset.selectionMode === 'chat') {
                                // Use this image for chat
                                const chatImagePreview = document.getElementById('chat-image-preview');
                                chatImagePreview.innerHTML = `<img src="${this.dataset.imageUrl}" alt="Chat Image">`;
                                chatImagePreview.dataset.imageUrl = this.dataset.imageUrl;
                                
                                // Clear selection mode
                                delete historyImagesGrid.dataset.selectionMode;
                                
                                // Switch back to chat tab
                                document.querySelector('nav a[data-tab="chat"]').click();
                                
                                // Clear previous chat messages
                                document.getElementById('chat-messages').innerHTML = 
                                    '<div class="empty-state">Image selected. Start chatting!</div>';
                            } else {
                                // Open the modal with this image and all details
                                openDetailedImageModal(this.dataset);
                            }
                        });
                        
                        imagesGrid.appendChild(card);
                    });
                }
                
                // Populate chat history
                const chatList = document.getElementById('chat-history-list');
                chatList.innerHTML = '';
                
                const chatEntries = fullHistory.filter(entry => entry.type === 'chat');
                
                if (chatEntries.length === 0) {
                    chatList.innerHTML = '<div class="empty-state">No chat history yet</div>';
                } else {
                    chatEntries.forEach(entry => {
                        const item = document.createElement('div');
                        item.className = 'chat-history-item';
                        
                        const img = document.createElement('img');
                        const fixedImageUrl = fixImagePath(entry.image_path);
                        img.src = fixedImageUrl;
                        img.alt = 'Chat Image';
                        img.className = 'chat-image';
                        img.onerror = function() {
                            console.error("Failed to load chat image:", fixedImageUrl);
                            this.src = '/static/image-error.png'; // Fallback image
                        };
                        
                        const content = document.createElement('div');
                        content.className = 'chat-content';
                        
                        const prompt = document.createElement('div');
                        prompt.className = 'chat-prompt';
                        prompt.textContent = `Q: ${entry.prompt}`;
                        
                        const response = document.createElement('div');
                        response.className = 'chat-response';
                        response.textContent = `A: ${entry.response_text.substring(0, 100)}${entry.response_text.length > 100 ? '...' : ''}`;
                        
                        const timestamp = document.createElement('div');
                        timestamp.className = 'timestamp';
                        timestamp.textContent = new Date(entry.timestamp).toLocaleString();
                        
                        content.appendChild(prompt);
                        content.appendChild(response);
                        content.appendChild(timestamp);
                        item.appendChild(img);
                        item.appendChild(content);
                        
                        // Store data for showing details
                        item.dataset.imageUrl = fixedImageUrl;
                        item.dataset.originalUrl = entry.image_path;
                        item.dataset.prompt = entry.prompt;
                        item.dataset.responseText = entry.response_text;
                        item.dataset.timestamp = entry.timestamp;
                        
                        // Add click event to show full details
                        item.addEventListener('click', function() {
                            // Open modal with chat details
                            openDetailedImageModal(this.dataset);
                        });
                        
                        chatList.appendChild(item);
                    });
                }
            } else {
                console.error('Error loading history:', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Enhanced modal function for detailed view
function openDetailedImageModal(data) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalCaption = document.getElementById('modal-caption');
    const modalEditBtn = document.getElementById('modal-edit');
    
    modalImage.src = fixImagePath(data.imageUrl);
    
    // Build caption with all available data
    let captionHTML = `<h3>${data.type === 'edit' ? 'Edited' : data.type === 'chat' ? 'Chat' : 'Generated'} Image</h3>`;
    captionHTML += `<p><strong>Prompt:</strong> ${data.prompt}</p>`;
    
    if (data.responseText) {
        captionHTML += `<p><strong>AI Response:</strong> ${data.responseText}</p>`;
    }
    
    captionHTML += `<p><small>Created: ${new Date(data.timestamp).toLocaleString()}</small></p>`;
    
    // If this is an edit, show the original image too
    if (data.type === 'edit' && data.inputImagePath) {
        captionHTML += `
            <div class="original-image-container">
                <h4>Original Image:</h4>
                <img src="${fixImagePath(data.inputImagePath)}" alt="Original Image" style="max-height: 150px; margin-top: 10px;">
            </div>
        `;
    }
    
    modalCaption.innerHTML = captionHTML;
    
    // Show/hide edit button as appropriate
    modalEditBtn.style.display = data.type === 'chat' ? 'none' : 'inline-block';
    
    modal.style.display = 'block';
}

// Modal functionality
function initModal() {
    const modal = document.getElementById('image-modal');
    const closeBtn = document.querySelector('.close-modal');
    const modalImage = document.getElementById('modal-image');
    const modalChatBtn = document.getElementById('modal-chat');
    const modalEditBtn = document.getElementById('modal-edit');
    const modalDownloadBtn = document.getElementById('modal-download');
    
    // Close modal when clicking the X
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside the content
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Chat about the image
    modalChatBtn.addEventListener('click', function() {
        // Switch to chat tab and set the current image
        document.querySelector('nav a[data-tab="chat"]').click();
        
        // Set the image in the chat tab
        const imgSrc = modalImage.src;
        const chatImagePreview = document.getElementById('chat-image-preview');
        chatImagePreview.innerHTML = `<img src="${imgSrc}" alt="Chat Image">`;
        chatImagePreview.dataset.imageUrl = imgSrc;
        
        // Clear any previous chat
        document.getElementById('chat-messages').innerHTML = 
            '<div class="empty-state">Image selected. Start chatting!</div>';
        
        // Close the modal
        modal.style.display = 'none';
    });
    
    // Edit the image
    modalEditBtn.addEventListener('click', function() {
        // Switch to edit tab
        document.querySelector('nav a[data-tab="edit"]').click();
        
        // Convert the modal image to a File object
        fetch(modalImage.src)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], "image-to-edit.png", {type: "image/png"});
                
                // Create a new DataTransfer object
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                
                // Set the file to the input
                const fileInput = document.getElementById('edit-image-upload');
                fileInput.files = dataTransfer.files;
                
                // Trigger change event
                const event = new Event('change');
                fileInput.dispatchEvent(event);
                
                // Close the modal
                modal.style.display = 'none';
            });
    });
    
    // Download the image
    modalDownloadBtn.addEventListener('click', function() {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = modalImage.src;
        link.download = 'image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// Function to open image modal
function openImageModal(imageUrl, caption = '') {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalCaption = document.getElementById('modal-caption');
    
    // Fix the image URL before setting
    modalImage.src = fixImagePath(imageUrl);
    modalCaption.textContent = caption;
    
    modal.style.display = 'block';
}
