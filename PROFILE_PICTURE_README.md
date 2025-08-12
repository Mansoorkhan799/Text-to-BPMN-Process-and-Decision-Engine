# Profile Picture Functionality

This document describes the new profile picture functionality that has been added to the application.

## Features

- **Profile Picture Upload**: Users can upload profile pictures by clicking on the profile picture area or dragging and dropping images
- **Image Validation**: Supports PNG, JPG, and GIF formats with a 5MB file size limit
- **Automatic Storage**: Profile pictures are automatically saved to the `public/uploads/profile-pictures/` directory
- **Database Integration**: Profile picture URLs are stored in the `users` table in the `profilePicture` field
- **Real-time Updates**: Profile pictures are updated in real-time across the application

## How It Works

### 1. Profile Picture Display
- The profile picture is displayed in the side menu profile section
- If no profile picture is uploaded, it shows the user's initials in a styled circle
- Profile pictures are displayed as circular images with proper aspect ratio

### 2. Uploading a Profile Picture
- Click the "Edit Profile" button in the profile section
- On the edit profile page, you'll see a profile picture upload section
- Click on the profile picture area or drag and drop an image file
- Supported formats: PNG, JPG, GIF
- Maximum file size: 5MB

### 3. File Storage
- Profile pictures are stored in `public/uploads/profile-pictures/`
- Files are named with a unique identifier: `profile_{userId}_{timestamp}.{extension}`
- The file path is stored in the database as a relative URL

## Technical Implementation

### Database Changes
- Added `profilePicture` field to the User model
- Updated User interface to include `profilePicture?: string`

### API Endpoints
- `POST /api/user/profile-picture` - Upload a new profile picture
- `DELETE /api/user/profile-picture` - Remove the current profile picture
- Updated existing profile endpoints to include profile picture data

### Components
- `ProfilePictureUpload` - Handles file selection and preview
- `ProfileForm` - Updated to include profile picture upload
- `Profile` - Updated to display actual profile pictures

### File Structure
```
public/
  uploads/
    profile-pictures/
      profile_{userId}_{timestamp}.{extension}
```

## Usage Examples

### Uploading a Profile Picture
1. Navigate to your profile
2. Click "Edit Profile"
3. In the profile picture section, click on the image area
4. Select an image file (PNG, JPG, or GIF)
5. Click "Save Changes"

### Removing a Profile Picture
1. Navigate to your profile
2. Click "Edit Profile"
3. The profile picture can be replaced by uploading a new one
4. To remove completely, you can use the DELETE API endpoint

## Security Features

- File type validation (only images allowed)
- File size limits (5MB maximum)
- Authentication required for all operations
- Files are stored in a controlled directory structure
- JWT token validation for all requests

## Error Handling

- Invalid file types show appropriate error messages
- File size exceeded shows size limit error
- Network errors are handled gracefully
- User-friendly error messages via toast notifications

## Browser Compatibility

- Modern browsers with File API support
- Drag and drop functionality
- Image preview before upload
- Responsive design for mobile and desktop

## Future Enhancements

- Image cropping and resizing
- Multiple image formats support
- Cloud storage integration
- Image optimization and compression
- Profile picture history
