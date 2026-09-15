import nodemailer from 'nodemailer';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : undefined;
};

const smtpEmail = getEnv('SMTP_EMAIL');
const smtpPassword = getEnv('SMTP_PASSWORD');

async function test() {
  console.log('Testing SMTP with:', smtpEmail);
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: smtpEmail,
      pass: smtpPassword
    }
  });

  try {
    await transporter.verify();
    console.log('SMTP Config Verified Successfully!');
  } catch (err) {
    console.error('SMTP Error:', err);
  }
}
test();
