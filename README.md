# HTML Snippet Builder

A web application for creating, managing and sharing HTML snippets. This application helps users build and organize HTML components that can be easily integrated into other websites.

## Deployment Architecture

This application uses a split architecture deployment:

- **Backend (API Server)**: Deployed on Render
- **Frontend (Static Assets)**: Deployed on Vercel

## Environment Variables

### Backend (Render) Environment Variables
- `PORT`: The port on which the server runs (default: 10000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for signing JWT tokens
- `MISTRAL_API_KEY`: API key for Mistral AI integration
- `NODE_ENV`: Environment mode (development/production)
- `REACT_APP_API_URL`: URL for the API endpoints (same as Render URL)
- `REACT_APP_SOCKET_URL`: URL for WebSocket connections (same as Render URL)

### Frontend (Vercel) Environment Variables
- `REACT_APP_API_URL`: URL of the backend API (should point to Render URL)
- `REACT_APP_SOCKET_URL`: URL for WebSocket connections (should point to Render URL)
- `NODE_ENV`: Environment mode (typically "production")

## Deployment Instructions

### Deploying the Backend to Render
1. Fork or clone this repository
2. Connect your GitHub account to Render
3. Create a new Web Service in Render
4. Link to your repository
5. Set the following configuration:
   - Name: `mbti-render` (or your preferred name)
   - Build Command: `npm install && npm run setup-static`
   - Start Command: `node server.js`
   - Add all environment variables listed in the Backend section above
6. Click "Create Web Service"

### Deploying the Frontend to Vercel
1. Fork or clone this repository
2. Connect your GitHub account to Vercel
3. Create a new project in Vercel
4. Link to your repository
5. Set the following configuration:
   - Framework Preset: Other
   - Build Command: None (uses vercel.json configuration)
   - Output Directory: public
   - Add all environment variables listed in the Frontend section above
6. Click "Deploy"

## Local Development

1. Clone the repository
```
git clone https://github.com/Reflective-Mind/HTML_Snippet.git
cd HTML_Snippet
```

2. Install dependencies
```
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory with the variables listed above.

4. Start the development server
```
npm run dev
```

## Troubleshooting Deployment

If you encounter issues with the deployment:

1. Verify all environment variables are correctly set in both Render and Vercel
2. Check that MongoDB connection is working correctly
3. Ensure the CORS settings allow communication between the backend and frontend
4. Check the build logs in both Render and Vercel for any errors
5. Verify that the repository URL in the server settings is correct

## Quick Start

For the easiest setup, run the one-click setup script:
```
npm run setup
```

This will:
1. Install all dependencies
2. Ensure port 5000 is free
3. Set up your environment file
4. Optionally configure your GitHub repository

## Local Development

### Windows Users

1. Install dependencies:
   ```
   npm install
   ```

2. Set up your environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your MongoDB connection string and other required variables

3. Start the development server using one of these methods:
   
   **Option 1 (Recommended)**: Use the Windows batch file:
   ```
   npm run start-win
   ```
   
   **Option 2**: Use the development batch file with auto-reload:
   ```
   npm run dev-win
   ```
   
   **Option 3**: Run the batch files directly:
   ```
   start-windows.bat
   ```
   or
   ```
   dev-windows.bat
   ```
   
   **Option 4**: Run the commands separately:
   ```
   node kill-port.js
   nodemon server.js
   ```

4. If you're having port issues, you can kill processes on port 5000:
   ```
   npm run kill-port
   ```

5. For PowerShell users who encounter issues with the `&&` operator, refer to the `powershell-commands.md` file for compatible commands.

6. Open [http://localhost:5000](http://localhost:5000) to view the application in your browser.

### Mac/Linux Users

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
   
   Or clean start:
   ```
   npm run dev-clean
   ```

4. Open [http://localhost:5000](http://localhost:5000) to view the application in your browser.

## Deployment Options

### Deploy to Vercel

1. Push your repository to GitHub.

2. Go to [Vercel](https://vercel.com) and sign up or log in.

3. Click on "Import Project" and select your GitHub repository.

4. Configure your environment variables in the Vercel dashboard:
   - `REACT_APP_API_URL`: https://mbti-render.onrender.com
   - `REACT_APP_SOCKET_URL`: https://mbti-render.onrender.com
   - `CHAT_SOCKET_URL`: https://mbti-render.onrender.com
   - `CHAT_API_URL`: https://mbti-render.onrender.com/api
   - `REACT_APP_CHAT_API_URL`: https://mbti-render.onrender.com/api
   - `NODE_ENV`: production

5. Click "Deploy" and Vercel will build and deploy your application.

6. Your application will be available at a URL like `https://your-project-name.vercel.app`.

7. You can also deploy from the command line:
   ```
   npm run deploy:vercel
   ```
   
   Or use the full commands:
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
   - Name: mbti-render
   - Environment: Node.js
   - Build Command: `npm install`
   - Start Command: `node server.js`

5. Add your environment variables in the Render dashboard:
   - `PORT`: 5000
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Your secret key for JWT
   - `MISTRAL_API_KEY`: Your API key
   - `NODE_ENV`: production
   - `DB_NAME`: html-snippet-builder

6. Alternatively, use the `render.yaml` file included in this repository for easy deployment.

7. Click "Create Web Service" and Render will build and deploy your application.

8. Your application will be available at the URL `https://mbti-render.onrender.com`.

## Features

- HTML snippet management
- Admin capabilities
- User authentication
- Real-time updates with Socket.IO
- MongoDB integration

## Login Credentials

- Email: eideken@hotmail.com
- Password: sword91

## Adding HTML Snippets

1. Click the "Add Snippet" button
2. Paste your HTML code in the prompt
3. The snippet will appear on the page
4. Drag it to position
5. Resize as needed

## Troubleshooting

### Port Already in Use (Windows)

If you see the error "listen EADDRINUSE: address already in use", try these solutions:

1. Run the kill-port script:
   ```
   node kill-port.js
   ```

2. Use the Windows Task Manager to find and end any Node.js processes.

3. Run this command in PowerShell to find and kill the process:
   ```
   netstat -ano | findstr :5000
   taskkill /F /PID <PID>
   ```

### PowerShell "&" Operator Issues

PowerShell doesn't support the `&&` operator like bash. Use the `dev-win` script or run commands separately:

```
npm run dev-win
```

Or:

```
node kill-port.js
nodemon server.js
```

## Support

For any questions or issues, please contact the repository owner.

## GitHub Integration

To push your code to GitHub:

1. Set up the GitHub repository:
   ```
   npm run setup-github
   ```
   This will guide you through initializing a repository and configuring the remote.

2. Push changes to GitHub:
   ```
   npm run push-github
   ```
   This will add your changes, prompt for a commit message, and push to GitHub. 