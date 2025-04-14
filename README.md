# HTML Snippet Website Builder

A powerful website builder that allows you to create pages by combining HTML snippets. Perfect for embedding interactive components like 3D globes, chat systems, and more.

## Features

- Admin authentication system
- Drag-and-drop HTML snippet placement
- Resizable snippet containers
- Multi-page support
- Automatic API integration for chat and AI features
- Mobile-responsive design

## Setup

1. Clone the repository:
```bash
git clone https://github.com/Reflective-Mind/Ken-Ultimate.git
cd Ken-Ultimate
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```
PORT=10000
MONGODB_URI=mongodb+srv://keneide91:3N6L1x0jeIhVX5wP@mbti-insights.s3vrf.mongodb.net/?retryWrites=true&w=majority&appName=mbti-insights
JWT_SECRET=cd06a943f7e3a56b2f7c8836736c0d6f2e3b58f9c742a563
MISTRAL_API_KEY=pjTVzQVIZyYNzWj7mjm5aysVYippTADy
NODE_ENV=production
```

4. Start the server:
```bash
npm start
```

## Usage

1. Access the website builder at `http://localhost:10000`
2. Log in with the admin credentials:
   - Email: eideken@hotmail.com
   - Password: sword91
3. Use the admin toolbar to:
   - Add new pages
   - Add HTML snippets
   - Arrange snippets by dragging
   - Resize snippets using the handle
4. Your changes are automatically saved to the database

## Adding HTML Snippets

1. Click the "Add Snippet" button
2. Paste your HTML code in the prompt
3. The snippet will appear on the page
4. Drag it to position
5. Resize as needed

## Example Snippets

### 3D Globe
```html
<!-- Paste the interactive-globe.html content here -->
```

### Chat Room
```html
<!-- Your chat room HTML -->
```

## Deployment

The application is configured for deployment on:
- Backend: Render.com
- Frontend: Vercel

## Security

- Admin authentication is JWT-based
- API keys are properly secured
- MongoDB connection is encrypted
- CORS is enabled for security

## Support

For any questions or issues, please contact the repository owner. 