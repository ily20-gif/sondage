import { Poll, PollOption, Vote, User, Notification } from "../models/index.js";
import { sendEmail } from "../lib/mailer.js";
import { Op } from "sequelize";
import { calculatePollResults } from "../utils/pollResults.js";
import { 
  pollClosingWarningTemplate, 
  voteResultsTemplate, 
  sondageResultsTemplate 
} from "../templates/notif.templates.js";
import sequelize from "../lib/sequelize.js";

export const sendPollClosingWarning = async () => {
  try {
    const now = new Date();
    
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000);
    const thirtyFiveMinutesFromNow = new Date(now.getTime() + 35 * 60 * 1000);

    console.log(`🔍 Checking for polls closing between ${twentyMinutesFromNow.toISOString()} and ${thirtyFiveMinutesFromNow.toISOString()}`);

    const polls = await Poll.findAll({
      where: {
        end_time: {
          [Op.gte]: twentyMinutesFromNow,
          [Op.lte]: thirtyFiveMinutesFromNow,
        },
        warning_sent: {
          [Op.or]: [false, null] 
        },
        status: "published",
      },
      include: [
        { model: User, attributes: ["email", "fullName"] },
        { model: PollOption, attributes: ["id", "option_text"] },
      ],
    });

    console.log(`📋 Found ${polls.length} polls needing warning`);

    let successCount = 0;
    let errorCount = 0;

    for (const poll of polls) {
      try {
        if (!poll.User || !poll.User.email) {
          console.log(`⚠️ Skipping poll ${poll.id}: No user email found`);
          errorCount++;
          continue;
        }

        if (!poll.end_time || !poll.question) {
          console.log(`⚠️ Skipping poll ${poll.id}: Missing required data`);
          errorCount++;
          continue;
        }

        const endTime = new Date(poll.end_time);
        const timeRemaining = Math.round((endTime - now) / (60 * 1000));

        if (timeRemaining <= 0) {
          console.log(`⚠️ Skipping poll ${poll.id}: Already ended (${timeRemaining} minutes)`);
          poll.warning_sent = true;
          await poll.save();
          continue;
        }

        const transaction = await sequelize.transaction();

        try {
          await Poll.update(
            { warning_sent: true },
            { 
              where: { 
                id: poll.id,
                warning_sent: {
                  [Op.or]: [false, null]
                }
              },
              transaction 
            }
          );

          const pollCreatorName = poll.User.fullName || "Admin";

          const emailContent = pollClosingWarningTemplate(
            pollCreatorName,
            poll.question,
            timeRemaining,
            endTime,
            poll.category,
            poll.options || []
          );

          await sendEmail(
            poll.User.email,
            `Poll Closing Soon: ${poll.question}`,
            emailContent,
            true
          );

          await Notification.create({
            message: `⏰ Poll "${poll.question}" will close in approximately ${timeRemaining} minutes`,
            poll_id: poll.id,
          }, { transaction });

          await transaction.commit();

          console.log(`✅ Sent warning for poll ${poll.id}: "${poll.question}" (${timeRemaining} min remaining)`);
          successCount++;

        } catch (error) {
          await transaction.rollback();
          throw error;
        }

      } catch (pollError) {
        console.error(`❌ Error processing poll ${poll.id}:`, pollError.message);
        errorCount++;
      }
    }

    console.log(`📊 Poll closing warnings: ${successCount} succeeded, ${errorCount} failed out of ${polls.length} total`);

  } catch (err) {
    console.error("💥 Critical error in sendPollClosingWarning:", err);
  }
};

export const sendPollResults = async () => {
  try {
    const now = new Date();

    console.log(`🔍 Checking for polls that ended before ${now.toISOString()}`);

    const polls = await Poll.findAll({
      where: {
        end_time: { [Op.lte]: now },
        status: "closed",
        results_sent: {
          [Op.or]: [false, null] 
        },
      },
      include: [
        { model: PollOption, attributes: ["id", "option_text"] },
        { model: Vote, include: [{ model: PollOption, attributes: ["id", "option_text"] }] },
        { model: User, attributes: ["email", "fullName"] }
      ],
    });

    console.log(`📋 Found ${polls.length} polls needing results sent`);

    let successCount = 0;
    let errorCount = 0;

    for (const poll of polls) {
      try {
        if (!poll.User || !poll.User.email) {
          console.log(`⚠️ Skipping poll results ${poll.id}: No user email found`);
          await Poll.update(
            { results_sent: true },
            { where: { id: poll.id } }
          );
          errorCount++;
          continue;
        }

        if (!poll.question || !poll.category) {
          console.log(`⚠️ Skipping poll results ${poll.id}: Missing required data`);
          await Poll.update(
            { results_sent: true },
            { where: { id: poll.id } }
          );
          errorCount++;
          continue;
        }

        const transaction = await sequelize.transaction();

        try {
          await Poll.update(
            { results_sent: true },
            { 
              where: { 
                id: poll.id,
                results_sent: {
                  [Op.or]: [false, null]
                }
              },
              transaction 
            }
          );

          const votes = poll.Votes || [];
          const totalVotes = votes.length;
          const options = poll.options || [];

          const { votesCount, winner } = calculatePollResults(poll, votes);

          let emailContent = "";
          let notificationMessage = "";
          
          if (poll.category === "vote") {
            const results = options.map((option) => {
              const count = votes.filter(v => v.option_selected === option).length;
              return {
                option_selected: option,
                count,
              };
            });

            const pollCreatorName = poll.User.fullName || "Admin";
            
            emailContent = voteResultsTemplate(
              pollCreatorName,
              poll.question,
              results,
              totalVotes,
              winner
            );

            notificationMessage = `🏆 Poll "${poll.question}" has ended! Winner${winner.length > 1 ? 's' : ''}: ${winner.join(', ')} - ${totalVotes} total votes`;

          } else if (poll.category === "sondage") {
            const results = options.map((option) => {
              const count = votes.filter(v => v.option_selected === option).length;
              const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              return {
                option_selected: option,
                percentage,
              };
            });

            const pollCreatorName = poll.User.fullName || "Admin";
            
            emailContent = sondageResultsTemplate(
              pollCreatorName,
              poll.question,
              results,
              totalVotes
            );

            notificationMessage = `📊 Poll "${poll.question}" has ended! Results are ready - ${totalVotes} total votes`;

          } else {
            console.log(`⚠️ Unknown poll category for poll ${poll.id}: ${poll.category}`);
            await transaction.commit();
            errorCount++;
            continue;
          }

          await sendEmail(
            poll.User.email,
            `Poll Results: ${poll.question}`,
            emailContent,
            true
          );

          await Notification.create({
            message: notificationMessage,
            poll_id: poll.id,
          }, { transaction });

          await transaction.commit();

          console.log(`✅ Sent results for poll ${poll.id}: "${poll.question}" (${totalVotes} votes)`);
          successCount++;

        } catch (error) {
          await transaction.rollback();
          throw error;
        }

      } catch (pollError) {
        console.error(`❌ Error processing poll results ${poll.id}:`, pollError.message);
        errorCount++;
      }
    }

    console.log(`📊 Poll results: ${successCount} succeeded, ${errorCount} failed out of ${polls.length} total`);

  } catch (err) {
    console.error("💥 Critical error in sendPollResults:", err);
  }
};

export const getAllNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userVotes = await Vote.findAll({
      where: { user_id: userId },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('poll_id')), 'poll_id']],
      raw: true,
    });

    const votedPollIds = userVotes.map(v => v.poll_id);

    const ownedPolls = await Poll.findAll({
      where: { created_by: userId }, 
      attributes: ["id"],
      raw: true,
    });

    const ownedPollIds = ownedPolls.map(p => p.id);

    const pollIds = [...new Set([...votedPollIds, ...ownedPollIds])];

    console.log(`📬 User ${userId} has ${pollIds.length} relevant polls`);

    if (pollIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        notifications: [],
      });
    }

    const notifications = await Notification.findAll({
      where: {
        poll_id: { [Op.in]: pollIds },
      },
      include: [
        {
          model: Poll,
          attributes: ["id", "question", "category"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    res.status(500).json({
      message: "Error fetching notifications",
      error: err.message,
    });
  }
};