# Known Issues

## File Upload in Development

### Issue
File uploads using UploadThing don't complete properly in local development. Files upload successfully to UploadThing's servers (you'll see 100% progress), but the completion callback never fires, so files aren't saved to the database.

### Root Cause
UploadThing's development mode has limitations with localhost. After a file is uploaded to their servers, UploadThing needs to call back to your server to trigger the `onUploadComplete` handler. In local development, UploadThing cannot reliably reach `localhost:3000`, so this callback never fires.

### Workaround Options

**Option 1: Use ngrok (Recommended for testing)**
```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 3000

# Update your UploadThing dashboard:
# - Set the webhook URL to https://YOUR_NGROK_URL.ngrok.io/api/uploadthing
# - Restart your dev server

# Now uploads will work because UploadThing can reach your server
```

**Option 2: Test in Production**
File uploads work perfectly when deployed to Vercel or any publicly accessible URL. Deploy to a preview environment to test the full upload flow.

**Option 3: Skip File Upload Testing in Development**
All other features work in development. You can skip file upload testing locally and verify it works after deployment.

### Production Status
✅ File uploads work perfectly in production environments (Vercel, etc.)

### Related
- UploadThing docs: https://docs.uploadthing.com/getting-started/appdir#configure-dev-server
- This is a known limitation of UploadThing's development mode
