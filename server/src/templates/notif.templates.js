import { APP_NAME } from "../lib/brand.js";
export const pollClosingWarningTemplate = (pollCreatorName, question, timeRemaining, endTime, category, options) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>Hello ${pollCreatorName},</h2>
      <p>This is a reminder that your poll <strong>"${question}"</strong> will be closing soon.</p>
      
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #856404;">
          ⏰ Poll closes in approximately <strong>${timeRemaining} minutes</strong>
        </p>
        <p style="margin: 5px 0 0 0; color: #856404;">
          Closing time: ${endTime.toLocaleString()}
        </p>
      </div>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2563eb;">Poll Details</h3>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Options:</strong></p>
        <ul>
          ${options.map(opt => `<li>${opt}</li>`).join("")}
        </ul>
      </div>

      <p>Make sure to check the results once the poll closes!</p>
      <p style="font-size: 12px; color: #888; margin-top: 30px;">This is an automated email from Poll App.</p>
    </div>
  `;
};

export const voteResultsTemplate = (pollCreatorName, question, results, totalVotes, winner) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>Hello ${pollCreatorName},</h2>
      <p>The poll <strong>"${question}"</strong> has ended. Here are the results:</p>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2563eb; margin-top: 0;">Poll Results</h3>
        
        <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Option</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Votes</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr style="${winner.includes(r.option_selected) ? 'background-color: #d4edda; font-weight: bold;' : ''}">
                <td style="padding: 8px; border: 1px solid #ddd;">${r.option_selected}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${r.count}</td>
              </tr>
            `).join("")}
            <tr style="font-weight: bold; background-color: #f9f9f9;">
              <td style="padding: 8px; border: 1px solid #ddd;">Total Votes</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${totalVotes}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #155724;">
            🏆 Winner${winner.length > 1 ? 's' : ''}: <strong>${winner.join(', ')}</strong>
          </p>
        </div>
      </div>
      
      <p style="font-size: 12px; color: #888; margin-top: 30px;">This is an automated email from Poll App.</p>
    </div>
  `;
};

export const sondageResultsTemplate = (pollCreatorName, question, results, totalVotes) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>Hello ${pollCreatorName},</h2>
      <p>The poll <strong>"${question}"</strong> has ended. Here are the results:</p>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2563eb; margin-top: 0;">Poll Results</h3>
        
        <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Option</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${r.option_selected}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                  <strong>${r.percentage}%</strong>
                </td>
              </tr>
            `).join("")}
            <tr style="font-weight: bold; background-color: #f9f9f9;">
              <td style="padding: 8px; border: 1px solid #ddd;">Total Votes</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${totalVotes}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <p style="font-size: 12px; color: #888; margin-top: 30px;">This is an automated email from Poll App.</p>
    </div>
  `;
};

// Email template for email verification
export const emailVerificationTemplate = (userName, verificationLink) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Verify Your Email Address</h2>
      <p>Hello ${userName},</p>
      <p>Thank you for signing up for ${APP_NAME}! Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" 
           style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Verify Email
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verificationLink}</p>
      <p style="color: #888; font-size: 12px; margin-top: 30px;">
        This link will expire in 24 hours. If you didn't create this account, please ignore this email.
      </p>
    </div>
  `;
};