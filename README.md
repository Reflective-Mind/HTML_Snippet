# HTML Snippet Builder

A website builder that manages HTML snippets with admin capabilities.

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Set up your environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your MongoDB connection string and other required variables

3. Start the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:10000](http://localhost:10000) to view the application in your browser.

## Deployment Options

### Deploy to Vercel

1. Push your repository to GitHub.

2. Go to [Vercel](https://vercel.com) and sign up or log in.

3. Click on "Import Project" and select your GitHub repository.

4. Configure your environment variables in the Vercel dashboard.

5. Click "Deploy" and Vercel will build and deploy your application.

6. Your application will be available at a URL like `https://your-project-name.vercel.app`.

7. You can also deploy from the command line:
   ```
   npm install -g vercel
   vercel login
   vercel --prod
   ```

### Deploy to Render

1. Push your repository to GitHub.

2. Go to [Render](https://render.com) and sign up or log in.

3. Click on "New Web Service" and connect your GitHub repository.

4. Configure the service:
   - Name: html-snippet-builder
   - Environment: Node.js
   - Build Command: `npm install`
   - Start Command: `npm start`

5. Add your environment variables in the Render dashboard.

6. Click "Create Web Service" and Render will build and deploy your application.

7. Your application will be available at a URL like `https://html-snippet-builder.onrender.com`.

## Features

- HTML snippet management
- Admin capabilities
- User authentication
- Real-time updates with Socket.IO
- MongoDB integration

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
MONGODB_URI=mongodb+srv://keneide91:3N6L1x0jeIhVX5wP@mbti-insights.s3vrf.mongodb.net/html-snippet-builder?retryWrites=true&w=majority&appName=mbti-insights
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

## Security

- Admin authentication is JWT-based
- API keys are properly secured
- MongoDB connection is encrypted
- CORS is enabled for security

## Support

For any questions or issues, please contact the repository owner. 