# HTML Viewer & Playground

A powerful HTML, CSS, and JavaScript playground with no login requirements and unrestricted capabilities. This application allows you to experiment with web development in a clean, modern interface with real-time preview and many helpful features.

## Features

- **Multiple Editors**: Separate editors for HTML, CSS, and JavaScript
- **Real-time Preview**: See your changes instantly with auto-run feature
- **Console Output**: Built-in console to view logs and errors
- **Responsive Design Preview**: Test your designs in desktop, tablet, and mobile views
- **Tab Management**: Work on multiple snippets at once
- **Save & Load**: Save your snippets to the server and load them later
- **Sharing**: Share your creations via URL or social media
- **Customizable**: Change editor theme, font size, and more
- **Resizable Panels**: Adjust the editor and preview panes to your preference
- **No Login Required**: Start using immediately with no authentication
- **Unrestricted**: No security limitations on what you can build

## Getting Started

### Prerequisites

- Node.js 14.0 or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd html-viewer-playground
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```
npm run build
npm start
```

## Deployment

### IMPORTANT: Deployment Branch
**All deployments must go to the `html-viewer-new` branch.**

### Deploying to Render

1. Push your changes to the `html-viewer-new` branch:
   ```bash
   git checkout html-viewer-new
   git merge master
   git push origin html-viewer-new
   ```
2. The Render service is configured to auto-deploy from this branch.

### Deploying to Vercel

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Deploy to Vercel:
   ```
   npm run deploy:vercel
   ```

## Usage

### Creating a New Snippet

1. Click the "+" button in the header to create a new tab
2. Write your HTML, CSS, and JavaScript in the respective editors
3. The preview updates automatically (you can toggle this off if needed)

### Saving Snippets

1. Click the "Save" button in the header
2. Enter a name and optional description for your snippet
3. Click "Save" in the modal

### Loading Snippets

1. Click the "Load" button in the header
2. Select a snippet from the list to load it

### Sharing Snippets

1. Click the "Share" button in the header
2. Copy the generated URL or share directly to social media

### Changing Settings

1. Click the "Settings" button in the header
2. Adjust editor theme, font size, and other options
3. Click "Save Settings"

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- [CodeMirror](https://codemirror.net/) for the powerful code editors
- [Font Awesome](https://fontawesome.com/) for the icons 