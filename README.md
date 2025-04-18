# Gemini Image Generator

A web application that uses Google's Gemini AI to generate, edit, and chat about images based on text prompts.

![Application Demo](static/screenshots/demo.png)

## 🌟 Features

- 🖼️ Generate images from text prompts
- ✏️ Edit existing images using text instructions
- 💬 Chat with AI about image content
- 📚 View history of generated images and conversations
- 📊 Comprehensive history tracking with prompts and responses

## 📋 Requirements

- Python 3.8+
- FastAPI
- Google Generative AI Python SDK
- Pillow (PIL Fork)
- python-dotenv
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Google Gemini API key

## 🚀 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/gemini-image-generator.git
   cd gemini-image-generator
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install the required packages:
   ```bash
   pip install fastapi uvicorn google-generative-ai pillow python-dotenv python-multipart
   ```

## ⚙️ Configuration

1. Create a `.env` file in the project root directory:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

2. Replace `your_api_key_here` with your Google Gemini API key. You can get one from [Google AI Studio](https://makersuite.google.com/app/apikey).

3. Make sure you have the required directory structure:
   ```
   project_root/
   ├── static/
   │   ├── css/
   │   ├── js/
   │   └── index.html
   ├── temp_images/
   ├── image_history/
   ├── prompt_history/
   ├── .env
   └── gem.py
   ```

   The application will create these directories automatically if they don't exist.

## 🏃‍♂️ Running the Application

1. Start the FastAPI server:
   ```bash
   python gem.py
   ```
   or
   ```bash
   uvicorn gem:app --reload --host 0.0.0.0 --port 8000
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:8000/
   ```

## 📱 Using the Application

### Generating Images
1. Click on the "Generate" tab
2. Enter your text prompt describing the image you want to create
3. Click "Generate Image"
4. Wait for the AI to create your image
5. Use the action buttons to chat about or edit the generated image

### Editing Images
1. Click on the "Edit" tab
2. Upload an image from your computer
3. Enter text instructions describing how you want to edit the image
4. Click "Edit Image"
5. Wait for the AI to create your edited version

### Chatting About Images
1. Click on the "Chat" tab
2. Upload an image or select one from your history
3. Ask questions or request information about the image
4. The AI will respond with insights about the image content

### Viewing History
1. Click on the "History" tab
2. Browse through your previously generated images
3. View past chat conversations
4. Click on any image to see details or use it again

## 🧪 Testing Image Serving

If you encounter issues with images not displaying:
1. Visit `http://localhost:8000/test-image-serving` to verify image serving
2. Use the direct test page at `http://localhost:8000/static/direct-test.html` to diagnose URL issues

## 🔍 Troubleshooting

### Images not displaying
- Make sure you're accessing the app through `http://localhost:8000/` and not opening the HTML files directly
- Check the browser console (F12) for any error messages
- Verify that the temp_images directory has write permissions
- Check that the API key is correctly set in your .env file

### API errors
- Verify that your API key is valid and has access to the required Gemini models
- Check your internet connection
- Look at the server console logs for detailed error messages

### Server won't start
- Check if another process is already using port 8000
- Verify that all required packages are installed
- Make sure your Python version is 3.8 or higher

## 💡 Development Notes

- The application uses FastAPI for the backend API
- Images are stored temporarily in the `temp_images` directory
- History records are stored as JSON files in the `prompt_history` directory
- The frontend is built with vanilla HTML, CSS, and JavaScript
- All API endpoints are documented at `http://localhost:8000/docs`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
