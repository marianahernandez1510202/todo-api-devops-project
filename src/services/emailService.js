const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Check if email configuration is available
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email configuration not complete. Email notifications will be disabled.');
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false // For development only
        }
      });

      this.isConfigured = true;
      console.log('Email service configured successfully');
    } catch (error) {
      console.error('Failed to configure email service:', error);
      this.isConfigured = false;
    }
  }

  async verifyConnection() {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    try {
      await this.transporter.verify();
      console.log('Email server connection verified');
      return true;
    } catch (error) {
      console.error('Email server connection failed:', error);
      throw error;
    }
  }

  async sendEmail(to, subject, html, text = '') {
    if (!this.isConfigured) {
      console.warn('Email service not configured. Skipping email send.');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendHighPriorityNotification(todo) {
    if (!this.isConfigured || process.env.ENABLE_NOTIFICATIONS !== 'true') {
      return;
    }

    const subject = `🚨 High Priority Todo Created: ${todo.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">🚨 High Priority Todo Alert</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">${todo.title}</h3>
          
          ${todo.description ? `
            <p style="color: #666; margin: 10px 0;">
              <strong>Description:</strong> ${todo.description}
            </p>
          ` : ''}
          
          <p style="color: #666; margin: 10px 0;">
            <strong>Priority:</strong> 
            <span style="background-color: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
              ${todo.priority}
            </span>
          </p>
          
          ${todo.due_date ? `
            <p style="color: #666; margin: 10px 0;">
              <strong>Due Date:</strong> ${new Date(todo.due_date).toLocaleDateString()}
            </p>
          ` : ''}
          
          <p style="color: #666; margin: 10px 0;">
            <strong>Created:</strong> ${new Date(todo.created_at).toLocaleString()}
          </p>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            ⚠️ This todo has been marked as <strong>high priority</strong>. Please review and take action as needed.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #888; font-size: 12px;">
            This is an automated notification from Todo API System<br>
            Generated at ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;

    const text = `
      HIGH PRIORITY TODO ALERT
      
      Title: ${todo.title}
      ${todo.description ? `Description: ${todo.description}` : ''}
      Priority: ${todo.priority.toUpperCase()}
      ${todo.due_date ? `Due Date: ${new Date(todo.due_date).toLocaleDateString()}` : ''}
      Created: ${new Date(todo.created_at).toLocaleString()}
      
      This todo has been marked as high priority. Please review and take action as needed.
    `;

    try {
      // In a real application, you would get the recipient from user preferences
      const recipient = process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER;
      await this.sendEmail(recipient, subject, html, text);
      console.log('High priority notification sent for todo:', todo.id);
    } catch (error) {
      console.error('Failed to send high priority notification:', error);
      throw error;
    }
  }

  async sendCompletionNotification(todo) {
    if (!this.isConfigured || process.env.ENABLE_NOTIFICATIONS !== 'true') {
      return;
    }

    const subject = `✅ Todo Completed: ${todo.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">✅ Todo Completed!</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">${todo.title}</h3>
          
          ${todo.description ? `
            <p style="color: #666; margin: 10px 0;">
              <strong>Description:</strong> ${todo.description}
            </p>
          ` : ''}
          
          <p style="color: #666; margin: 10px 0;">
            <strong>Priority:</strong> 
            <span style="background-color: ${this.getPriorityColor(todo.priority)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
              ${todo.priority}
            </span>
          </p>
          
          <p style="color: #666; margin: 10px 0;">
            <strong>Completed:</strong> ${new Date(todo.updated_at).toLocaleString()}
          </p>
          
          <p style="color: #666; margin: 10px 0;">
            <strong>Created:</strong> ${new Date(todo.created_at).toLocaleString()}
          </p>
        </div>
        
        <div style="background-color: #d1edff; border: 1px solid #74c0fc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0c5460;">
            🎉 Congratulations! You've completed this todo. Keep up the great work!
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #888; font-size: 12px;">
            This is an automated notification from Todo API System<br>
            Generated at ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;

    const text = `
      TODO COMPLETED
      
      Title: ${todo.title}
      ${todo.description ? `Description: ${todo.description}` : ''}
      Priority: ${todo.priority.toUpperCase()}
      Completed: ${new Date(todo.updated_at).toLocaleString()}
      Created: ${new Date(todo.created_at).toLocaleString()}
      
      Congratulations! You've completed this todo.
    `;

    try {
      const recipient = process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER;
      await this.sendEmail(recipient, subject, html, text);
      console.log('Completion notification sent for todo:', todo.id);
    } catch (error) {
      console.error('Failed to send completion notification:', error);
      throw error;
    }
  }

  async sendDailyDigest(todos) {
    if (!this.isConfigured || process.env.ENABLE_NOTIFICATIONS !== 'true') {
      return;
    }

    const pendingTodos = todos.filter(todo => !todo.completed);
    const completedTodos = todos.filter(todo => todo.completed);
    const overdueTodos = todos.filter(todo => 
      !todo.completed && todo.due_date && new Date(todo.due_date) < new Date()
    );

    const subject = `📋 Daily Todo Digest - ${new Date().toLocaleDateString()}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">📋 Daily Todo Digest</h2>
        <p style="color: #666;">Here's your todo summary for ${new Date().toLocaleDateString()}</p>
        
        <div style="display: flex; flex-wrap: wrap; margin: 20px 0;">
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 5px; flex: 1; min-width: 150px;">
            <h4 style="margin: 0 0 5px 0; color: #856404;">⏳ Pending</h4>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #856404;">${pendingTodos.length}</p>
          </div>
          
          <div style="background-color: #d1edff; padding: 15px; border-radius: 8px; margin: 5px; flex: 1; min-width: 150px;">
            <h4 style="margin: 0 0 5px 0; color: #0c5460;">✅ Completed</h4>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #0c5460;">${completedTodos.length}</p>
          </div>
          
          <div style="background-color: #f5c6cb; padding: 15px; border-radius: 8px; margin: 5px; flex: 1; min-width: 150px;">
            <h4 style="margin: 0 0 5px 0; color: #721c24;">🚨 Overdue</h4>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #721c24;">${overdueTodos.length}</p>
          </div>
        </div>
        
        ${overdueTodos.length > 0 ? `
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #721c24; margin-top: 0;">⚠️ Overdue Todos</h3>
            ${overdueTodos.slice(0, 5).map(todo => `
              <p style="margin: 5px 0; color: #721c24;">
                • ${todo.title} ${todo.due_date ? `(Due: ${new Date(todo.due_date).toLocaleDateString()})` : ''}
              </p>
            `).join('')}
            ${overdueTodos.length > 5 ? `<p style="color: #721c24; font-style: italic;">... and ${overdueTodos.length - 5} more</p>` : ''}
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #888; font-size: 12px;">
            Daily digest from Todo API System<br>
            Generated at ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;

    try {
      const recipient = process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER;
      await this.sendEmail(recipient, subject, html);
      console.log('Daily digest sent successfully');
    } catch (error) {
      console.error('Failed to send daily digest:', error);
      throw error;
    }
  }

  getPriorityColor(priority) {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  }

  // Test email functionality
  async sendTestEmail() {
    const subject = '✅ Todo API - Email Service Test';
    const html = `
      <h2>Email Service Test</h2>
      <p>If you're reading this, the email service is working correctly!</p>
      <p>Timestamp: ${new Date().toLocaleString()}</p>
    `;

    try {
      const recipient = process.env.EMAIL_USER;
      await this.sendEmail(recipient, subject, html);
      console.log('Test email sent successfully');
      return true;
    } catch (error) {
      console.error('Test email failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();