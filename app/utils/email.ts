import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Path for OTP storage
const OTP_FILE_PATH = path.join(process.cwd(), 'tmp', 'otp-store.json');

// Ensure the tmp directory exists
if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
  fs.mkdirSync(path.join(process.cwd(), 'tmp'));
}

// Initialize OTP store file if it doesn't exist
if (!fs.existsSync(OTP_FILE_PATH)) {
  fs.writeFileSync(OTP_FILE_PATH, JSON.stringify({}));
}

// Read OTP store from file
const readOTPStore = () => {
  try {
    const data = fs.readFileSync(OTP_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading OTP store:', error);
    return {};
  }
};

// Write OTP store to file
const writeOTPStore = (store: Record<string, { otp: string; timestamp: number }>) => {
  try {
    fs.writeFileSync(OTP_FILE_PATH, JSON.stringify(store));
  } catch (error) {
    console.error('Error writing OTP store:', error);
  }
};

// Generate a 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP with 5 minutes expiry
export const storeOTP = (email: string, otp: string) => {
  try {
    console.log('Storing OTP for email:', email, 'OTP:', otp); // Debug log
    
    // Read current store
    const store = readOTPStore();
    
    // Store new OTP
    store[email] = {
      otp,
      timestamp: Date.now(),
    };
    
    // Write updated store
    writeOTPStore(store);
    
    console.log('OTP stored successfully. Current store:', store); // Debug log
    return true;
  } catch (error) {
    console.error('Error storing OTP:', error);
    return false;
  }
};

// Verify OTP
export const verifyOTP = (email: string, otp: string): boolean => {
  try {
    console.log('Verifying OTP for email:', email, 'Input OTP:', otp); // Debug log
    
    // Read current store
    const store = readOTPStore();
    console.log('Current OTP store:', store); // Debug log
    
    const stored = store[email];
    console.log('Stored OTP data:', stored); // Debug log

    if (!stored) {
      console.log('No OTP found for email:', email); // Debug log
      return false;
    }

    // Check if OTP is expired (5 minutes)
    const isExpired = Date.now() - stored.timestamp > 5 * 60 * 1000;
    if (isExpired) {
      console.log('OTP expired for email:', email); // Debug log
      delete store[email];
      writeOTPStore(store);
      return false;
    }

    // Compare OTPs
    const isValid = stored.otp === otp;
    console.log('OTP validation result:', isValid, 'Stored:', stored.otp, 'Input:', otp); // Debug log

    if (isValid) {
      // Remove used OTP
      delete store[email];
      writeOTPStore(store);
    }
    return isValid;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
};

// Send OTP email
export const sendOTPEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Email Verification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Your OTP for email verification is:</p>
        <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px; text-align: center;">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}; 