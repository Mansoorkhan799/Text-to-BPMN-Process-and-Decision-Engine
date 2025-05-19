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

// Send notification email for BPMN approval
export const sendNotificationEmail = async (
  to: string,
  title: string,
  message: string,
  senderName: string,
  appUrl: string
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: `BPMN Approval Request: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">BPMN Approval Request</h2>
        <h3 style="color: #4F46E5;">${title}</h3>
        <p><strong>From:</strong> ${senderName}</p>
        <p>${message}</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${appUrl}/signin?redirect=notifications" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Review BPMN
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">If the button above doesn't work, copy and paste this URL into your browser: ${appUrl}/signin?redirect=notifications</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending notification email:', error);
    return false;
  }
};

// Send notification email for BPMN status update (approved/rejected)
export const sendStatusUpdateEmail = async (
  to: string,
  status: 'approved' | 'rejected',
  title: string,
  feedback: string,
  reviewerName: string,
  appUrl: string
) => {
  const statusColor = status === 'approved' ? '#22C55E' : '#EF4444';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: `BPMN ${statusText}: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">BPMN ${statusText}</h2>
        <h3 style="color: ${statusColor};">${title}</h3>
        <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
        <p><strong>Reviewed by:</strong> ${reviewerName}</p>
        ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ''}
        <div style="margin: 30px 0; text-align: center;">
          <a href="${appUrl}/signin?redirect=notifications" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            View Details
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">If the button above doesn't work, copy and paste this URL into your browser: ${appUrl}/signin?redirect=notifications</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending status update email:', error);
    return false;
  }
}; 