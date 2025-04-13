# HTML Snippet Builder

A website builder that manages HTML snippets with admin capabilities.

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