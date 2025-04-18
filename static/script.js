// static/script.js
document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show selected tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
            
            // Refresh the history view when clicking on the history tab
            if (tabId === 'history') {
                console.log("History tab activated, refreshing view");
                imageHistory.renderHistory();
            }
        });
    });
    
    // Image History Management
    const imageHistory = {
        items: [],
        
        init() {
            // Load saved history from localStorage
            const savedHistory = localStorage.getItem('aiImageHistory');
            if (savedHistory) {
                try {
                    this.items = JSON.parse(savedHistory);
                } catch (e) {
                    console.error('Failed to parse history:', e);
                    this.items = [];
                }
            }
            
            // Initial render
            this.renderHistory();
        },
        
        addItem(prompt, imageUrl, dataUrl, message, type = 'generated') {
            const item = {
                id: Date.now(),
                date: new Date().toISOString(),
                prompt,
                imageUrl,
                dataUrl,
                message,
                type
            };
            
            this.items.unshift(item); // Add to start (newest first)
            this.saveHistory();
            this.renderHistory();
            
            return item;
        },
        
        clearHistory() {
            this.items = [];
            this.saveHistory();
            this.renderHistory();
        },
        
        saveHistory() {
            localStorage.setItem('aiImageHistory', JSON.stringify(this.items));
        },
        
        renderHistory() {
            const historyGrid = document.getElementById('history-grid');
            const emptyMessage = document.getElementById('history-empty');
            const historyControls = document.getElementById('history-controls');
            
            // Clear current content
            historyGrid.innerHTML = '';
            
            if (this.items.length === 0) {
                emptyMessage.classList.remove('hidden');
                historyControls.classList.add('hidden');
                return;
            }
            
            emptyMessage.classList.add('hidden');
            historyControls.classList.remove('hidden');
            
            console.log(`Rendering ${this.items.length} history items`);
            
            // Render each history item
            this.items.forEach(item => {
                const template = document.getElementById('history-item-template');
                const clone = document.importNode(template.content, true);
                
                // Apply edited class if it's an edited image
                if (item.type === 'edited') {
                    clone.querySelector('.history-item').classList.add('edited');
                }
                
                // Set image source - prefer data URL if available
                const image = clone.querySelector('.history-image');
                const imageContainer = clone.querySelector('.history-image-container');
                
                // Add a loading indicator
                const loader = document.createElement('div');
                loader.className = 'image-loader';
                imageContainer.appendChild(loader);
                
                if (item.dataUrl) {
                    image.src = item.dataUrl;
                    // Add debug class to show we're using data URL
                    image.classList.add('from-data-url');
                } else {
                    // Use the stored URL with server prefix if needed
                    let imageUrl = item.imageUrl;
                    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                        imageUrl = `http://127.0.0.1:8000${imageUrl}`;
                    }
                    
                    // Add cache buster to force reload
                    const cacheBuster = new Date().getTime();
                    imageUrl = `${imageUrl}?t=${cacheBuster}`;
                    
                    image.src = imageUrl;
                    // Add debug info
                    image.classList.add('from-server-url');
                    image.setAttribute('data-original-url', item.imageUrl);
                }
                
                // Add image load/error handlers
                image.onload = function() {
                    console.log(`History image loaded successfully: ${item.prompt}`);
                    loader.remove();
                    imageContainer.classList.add('loaded');
                };
                
                image.onerror = function() {
                    console.error(`Failed to load history image: ${item.prompt}`, {
                        dataUrl: !!item.dataUrl,
                        imageUrl: item.imageUrl
                    });
                    loader.remove();
                    imageContainer.classList.add('error');
                    imageContainer.innerHTML += '<div class="image-error">Image failed to load</div>';
                };
                
                // Set other details
                clone.querySelector('.history-prompt').textContent = item.prompt;
                clone.querySelector('.history-date').textContent = new Date(item.date).toLocaleString();
                
                // Set up action buttons
                const editBtn = clone.querySelector('.use-in-edit-btn');
                editBtn.addEventListener('click', () => this.useForEdit(item));
                
                const copyBtn = clone.querySelector('.copy-prompt-btn');
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(item.prompt)
                        .then(() => alert('Prompt copied to clipboard!'))
                        .catch(err => console.error('Failed to copy prompt:', err));
                });
                
                historyGrid.appendChild(clone);
            });
        },
        
        useForEdit(item) {
            console.log("Using history item for edit:", item);
            
            // Switch to edit tab
            document.querySelector('.tab-btn[data-tab="edit"]').click();
            
            // Set the prompt
            document.getElementById('edit-prompt').value = item.prompt;
            
            // Fetch the image and set it in the upload field
            let imageUrl = item.dataUrl || item.imageUrl;
            if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                imageUrl = `http://127.0.0.1:8000${imageUrl}`;
            }
            
            console.log("Fetching image from:", imageUrl);
            
            // Show loading state in the edit tab
            const previewContainer = document.getElementById('preview-container');
            const imagePreview = document.getElementById('image-preview');
            imagePreview.src = '';
            previewContainer.classList.add('loading');
            document.getElementById('edit-btn').disabled = true;
            
            fetch(imageUrl)
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`Failed to fetch image: ${res.status}`);
                    }
                    console.log("Image fetch successful, getting blob");
                    return res.blob();
                })
                .then(blob => {
                    console.log("Image blob received:", blob.type, blob.size);
                    const file = new File([blob], "history-image.png", { type: blob.type || "image/png" });
                    
                    // Create a DataTransfer object to simulate file input
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    
                    const imageUpload = document.getElementById('image-upload');
                    imageUpload.files = dataTransfer.files;
                    
                    console.log("Image file set, dispatching change event");
                    
                    // Trigger change event
                    const event = new Event('change');
                    imageUpload.dispatchEvent(event);
                    
                    // Enable edit button explicitly
                    document.getElementById('edit-btn').disabled = false;
                })
                .catch(error => {
                    console.error('Error using history image for editing:', error);
                    alert('Failed to use image for editing. Try downloading and uploading manually.');
                    previewContainer.classList.remove('loading');
                });
        },
        
        sortHistory(order) {
            if (order === 'newest') {
                this.items.sort((a, b) => new Date(b.date) - new Date(a.date));
            } else {
                this.items.sort((a, b) => new Date(a.date) - new Date(b.date));
            }
            this.renderHistory();
        }
    };
    
    // Initialize history
    imageHistory.init();
    
    // History sort event listener
    document.getElementById('sort-history').addEventListener('change', (e) => {
        imageHistory.sortHistory(e.target.value);
    });
    
    // Clear history button
    document.getElementById('clear-history-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all image history? This cannot be undone.')) {
            imageHistory.clearHistory();
        }
    });
    
    // Generate Image
    const generateBtn = document.getElementById('generate-btn');
    const generatePrompt = document.getElementById('generate-prompt');
    const generateSpinner = document.getElementById('generate-spinner');
    const generateError = document.getElementById('generate-error');
    const generateResult = document.getElementById('generate-result');
    const generatedImage = document.getElementById('generated-image');
    const generatedMessage = document.getElementById('generated-image-message');
    const useForEditBtn = document.getElementById('use-for-edit');
    
    generateBtn.addEventListener('click', async () => {
        if (!generatePrompt.value.trim()) {
            alert('Please enter a prompt to generate an image');
            return;
        }
        
        // Show loading state
        generateBtn.disabled = true;
        generateSpinner.classList.remove('hidden');
        generateError.classList.add('hidden');
        generateResult.classList.add('hidden');
        
        try {
            const formData = new FormData();
            formData.append('prompt', generatePrompt.value);
            
            const response = await fetch('http://127.0.0.1:8000/generate-image/', {
                method: 'POST',
                body: formData
            });
            
            // Check if response is OK and contains JSON
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server did not return JSON. Check server logs for errors.');
            }
            
            const data = await response.json();
            console.log("Server response:", data);
            
            if (data.success) {
                // Use data URL directly if available (most reliable)
                if (data.data_url) {
                    console.log("Using data URL for image");
                    generatedImage.src = data.data_url;
                    
                    // Also display the alternative URL for reference
                    document.getElementById('debug-image-url').textContent = "Alternative URL (if image above is not visible)";
                    document.getElementById('debug-image-url').href = `http://127.0.0.1:8000${data.image_url}`;
                    document.getElementById('debug-section').classList.remove('hidden');
                } else {
                    // Use the standard URL approach as fallback
                    let imageUrl = data.image_url;
                    imageUrl = imageUrl.trim().replace(/['"]/g, '');
                    
                    if (!imageUrl.startsWith('http')) {
                        imageUrl = `http://127.0.0.1:8000${imageUrl}`;
                    }
                    
                    const cacheBuster = new Date().getTime();
                    const finalUrl = encodeURI(`${imageUrl}?t=${cacheBuster}`);
                    console.log("Using regular URL for image:", finalUrl);
                    
                    document.getElementById('debug-image-url').textContent = finalUrl;
                    document.getElementById('debug-image-url').href = finalUrl;
                    document.getElementById('debug-section').classList.remove('hidden');
                    
                    generatedImage.src = finalUrl;
                }
                
                // Show result container and ensure image is visible
                generateResult.classList.remove('hidden');
                generatedImage.style.display = 'block';
                
                // Add load/error handlers
                generatedImage.onload = () => {
                    console.log("Image loaded successfully");
                };
                
                generatedImage.onerror = (e) => {
                    console.error("Error loading image:", e);
                    generateError.textContent = "Image couldn't be displayed. Try the direct link below or check server logs.";
                    generateError.classList.remove('hidden');
                };
                
                generatedMessage.textContent = data.message || '';
                
                // Add to history
                imageHistory.addItem(
                    generatePrompt.value,
                    data.image_url,
                    data.data_url,
                    data.message
                );
            } else {
                throw new Error(data.message || 'Failed to generate image');
            }
        } catch (error) {
            generateError.textContent = error.message || 'An error occurred while generating the image';
            generateError.classList.remove('hidden');
            console.error('Generation error:', error);
        } finally {
            generateBtn.disabled = false;
            generateSpinner.classList.add('hidden');
        }
    });
    
    // Image Upload Preview
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const previewContainer = document.getElementById('preview-container');
    const clearImageBtn = document.getElementById('clear-image');
    const editBtn = document.getElementById('edit-btn');
    
    imageUpload.addEventListener('change', event => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                imagePreview.src = e.target.result;
                previewContainer.classList.remove('hidden');
                editBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    });
    
    clearImageBtn.addEventListener('click', () => {
        imageUpload.value = '';
        previewContainer.classList.add('hidden');
        editBtn.disabled = true;
    });
    
    // Use generated image for editing
    useForEditBtn.addEventListener('click', () => {
        // Switch to edit tab
        tabBtns.forEach(b => {
            if (b.getAttribute('data-tab') === 'edit') {
                b.click();
            }
        });
        
        // Make sure we have the full URL
        let imageUrl = generatedImage.src;
        console.log("Fetching image for edit from:", imageUrl);
        
        fetch(imageUrl)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to fetch image: ${res.status}`);
                }
                return res.blob();
            })
            .then(blob => {
                const file = new File([blob], "generated-image.png", { type: "image/png" });
                
                // Create a DataTransfer object to simulate file input
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                imageUpload.files = dataTransfer.files;
                
                // Trigger change event
                const event = new Event('change');
                imageUpload.dispatchEvent(event);
            })
            .catch(error => {
                console.error('Error using generated image:', error);
                alert('Failed to use generated image for editing');
            });
    });
    
    // Edit Image
    const editPrompt = document.getElementById('edit-prompt');
    const editSpinner = document.getElementById('edit-spinner');
    const editError = document.getElementById('edit-error');
    const editResult = document.getElementById('edit-result');
    const editedImage = document.getElementById('edited-image');
    const editedMessage = document.getElementById('edited-image-message');
    
    // Create a "View in History" button to add to edit results
    const viewInHistoryBtn = document.createElement('button');
    viewInHistoryBtn.id = 'view-in-history-btn';
    viewInHistoryBtn.className = 'secondary-btn';
    viewInHistoryBtn.textContent = 'View in History';
    viewInHistoryBtn.style.marginTop = '10px';
    viewInHistoryBtn.addEventListener('click', () => {
        // Switch to history tab and highlight the newest item
        document.querySelector('.tab-btn[data-tab="history"]').click();
        
        // Highlight the first (newest) item in history briefly 
        setTimeout(() => {
            const firstItem = document.querySelector('.history-item');
            if (firstItem) {
                firstItem.classList.add('highlight-item');
                setTimeout(() => firstItem.classList.remove('highlight-item'), 2000);
            }
        }, 100);
    });
    
    // Add the button to the edit result container
    document.getElementById('edit-result').appendChild(viewInHistoryBtn);
    
    editBtn.addEventListener('click', async () => {
        if (!imageUpload.files[0]) {
            alert('Please upload an image to edit');
            return;
        }
        
        if (!editPrompt.value.trim()) {
            alert('Please enter a prompt to edit the image');
            return;
        }
        
        // Show loading state
        editBtn.disabled = true;
        editSpinner.classList.remove('hidden');
        editError.classList.add('hidden');
        editResult.classList.add('hidden');
        
        try {
            const formData = new FormData();
            formData.append('prompt', editPrompt.value);
            formData.append('image', imageUpload.files[0]);
            
            const response = await fetch('http://127.0.0.1:8000/edit-image/', {
                method: 'POST',
                body: formData
            });
            
            // Check if response is OK and contains JSON
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server did not return JSON. Check server logs for errors.');
            }
            
            const data = await response.json();
            console.log("Edit server response:", data);
            
            if (data.success) {
                // Clear any previous errors first
                editError.classList.add('hidden');
                editError.textContent = '';
                
                // Use data URL directly if available (most reliable)
                let imgSrc = '';
                if (data.data_url) {
                    console.log("Using data URL for edited image");
                    imgSrc = data.data_url;
                    editedImage.src = data.data_url;
                } else {
                    // Use the standard URL approach as fallback
                    let imageUrl = data.image_url;
                    imageUrl = imageUrl.trim().replace(/['"]/g, '');
                    
                    if (!imageUrl.startsWith('http')) {
                        imageUrl = `http://127.0.0.1:8000${imageUrl}`;
                    }
                    
                    const cacheBuster = new Date().getTime();
                    const finalUrl = encodeURI(`${imageUrl}?t=${cacheBuster}`);
                    console.log("Using regular URL for edited image:", finalUrl);
                    
                    imgSrc = finalUrl;
                    editedImage.src = finalUrl;
                }
                
                // Ensure we capture the current source before setting new one
                editedImage.onload = () => {
                    console.log("Edited image loaded successfully");
                    // Once image is loaded successfully, clear any previous errors
                    editError.classList.add('hidden');
                    // Show the result container once the image is loaded
                    editResult.classList.remove('hidden');
                    // Make sure the View in History button is visible
                    viewInHistoryBtn.classList.remove('hidden');
                };
                
                editedImage.onerror = (e) => {
                    console.error("Error loading edited image:", e);
                    // Try one more approach - create a new image element
                    const tempImg = new Image();
                    tempImg.onload = function() {
                        console.log("Temp image loaded successfully via alternate method");
                        // Replace the failed image with this one
                        editedImage.src = this.src;
                        editResult.classList.remove('hidden');
                    };
                    tempImg.onerror = function() {
                        console.error("Even temp image failed to load");
                        editError.textContent = "Image couldn't be displayed. Try the direct link below or check server logs.";
                        editError.classList.remove('hidden');
                    };
                    tempImg.src = imgSrc;
                };
                
                // Force display the image container
                editResult.classList.remove('hidden');
                editedImage.style.display = 'block';
                
                // Update the debug info
                document.getElementById('debug-edit-url').textContent = imgSrc;
                document.getElementById('debug-edit-url').href = imgSrc;
                document.getElementById('debug-edit-section').classList.remove('hidden');
                
                editedMessage.textContent = data.message || '';
                
                // Add to history and log for debugging
                console.log("Adding edited image to history:", {
                    prompt: editPrompt.value,
                    imageUrl: data.image_url,
                    hasDataUrl: !!data.data_url,
                    type: 'edited'
                });
                
                // First remove viewInHistoryBtn from being hidden
                viewInHistoryBtn.classList.remove('hidden');
                
                const historyItem = imageHistory.addItem(
                    editPrompt.value,
                    data.image_url,
                    data.data_url,
                    data.message,
                    'edited' // Add type to distinguish edited images
                );
                
                console.log("Added to history, new count:", imageHistory.items.length);
                console.log("New history item:", historyItem);
                
                // Force refresh the history grid to ensure it shows the new item
                imageHistory.renderHistory();
            } else {
                throw new Error(data.message || 'Failed to edit image');
            }
        } catch (error) {
            editError.textContent = error.message || 'An error occurred while editing the image';
            editError.classList.remove('hidden');
            console.error('Edit error:', error);
        } finally {
            editBtn.disabled = false;
            editSpinner.classList.add('hidden');
        }
    });

    // At the end of the document ready function, add a reminder about localStorage
    console.log("Image history loaded with", imageHistory.items.length, "items");
    
    // In some browsers, localStorage might be disabled or quota exceeded
    // Let's detect and warn about that
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
    } catch (e) {
        console.error("localStorage is not available:", e);
        alert("Warning: Your browser settings may prevent saving image history. Enable cookies/localStorage for this site to use history features.");
    }
});