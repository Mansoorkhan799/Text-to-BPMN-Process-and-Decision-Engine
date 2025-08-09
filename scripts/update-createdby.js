const mongoose = require('mongoose');
const User = require('../models/User');
const BpmnFile = require('../models/BpmnFile');
const BpmnNode = require('../models/BpmnNode');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name';

async function updateCreatedByFields() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update BpmnFile documents
    console.log('Updating BpmnFile documents...');
    const bpmnFiles = await BpmnFile.find({});
    
    for (const file of bpmnFiles) {
      if (file.userId) {
        try {
          const user = await User.findById(file.userId);
          if (user) {
            const userName = user.name || user.email || file.userId;
            
            // Update the createdBy field in advancedDetails
            if (file.advancedDetails) {
              file.advancedDetails.createdBy = userName;
              // Ensure creation date is set if not already present
              if (!file.advancedDetails.dateOfCreation) {
                const creationDate = file.createdAt || new Date();
                file.advancedDetails.dateOfCreation = creationDate.toISOString().slice(0, 19).replace('T', ' ');
              }
              // Ensure modification date is set if not already present
              if (!file.advancedDetails.modificationDate) {
                const modificationDate = file.updatedAt || new Date();
                file.advancedDetails.modificationDate = modificationDate.toISOString().slice(0, 19).replace('T', ' ');
              }
            } else {
              const creationDate = file.createdAt || new Date();
              const modificationDate = file.updatedAt || new Date();
              file.advancedDetails = {
                versionNo: '1.0.0',
                processStatus: '',
                classification: '',
                dateOfCreation: creationDate.toISOString().slice(0, 19).replace('T', ' '),
                dateOfReview: '',
                effectiveDate: '',
                modificationDate: modificationDate.toISOString().slice(0, 19).replace('T', ' '),
                modifiedBy: userName,
                changeDescription: 'Updated createdBy field',
                createdBy: userName,
              };
            }
            
            await file.save();
            console.log(`Updated BpmnFile ${file.fileId || file._id}: createdBy = ${userName}`);
          }
        } catch (error) {
          console.error(`Error updating BpmnFile ${file.fileId || file._id}:`, error.message);
        }
      }
    }

    // Update BpmnNode documents
    console.log('Updating BpmnNode documents...');
    const bpmnNodes = await BpmnNode.find({});
    
    for (const node of bpmnNodes) {
      if (node.userId) {
        try {
          const user = await User.findById(node.userId);
          if (user) {
            const userName = user.name || user.email || node.userId;
            
            // Update the createdBy field in advancedDetails
            if (node.advancedDetails) {
              node.advancedDetails.createdBy = userName;
              // Ensure creation date is set if not already present
              if (!node.advancedDetails.dateOfCreation) {
                const creationDate = node.createdAt || new Date();
                node.advancedDetails.dateOfCreation = creationDate.toISOString().slice(0, 19).replace('T', ' ');
              }
              // Ensure modification date is set if not already present
              if (!node.advancedDetails.modificationDate) {
                const modificationDate = node.updatedAt || new Date();
                node.advancedDetails.modificationDate = modificationDate.toISOString().slice(0, 19).replace('T', ' ');
              }
            } else if (node.type === 'file') {
              const creationDate = node.createdAt || new Date();
              const modificationDate = node.updatedAt || new Date();
              node.advancedDetails = {
                versionNo: '1.0.0',
                processStatus: '',
                classification: '',
                dateOfCreation: creationDate.toISOString().slice(0, 19).replace('T', ' '),
                dateOfReview: '',
                effectiveDate: '',
                modificationDate: modificationDate.toISOString().slice(0, 19).replace('T', ' '),
                modifiedBy: userName,
                changeDescription: 'Updated createdBy field',
                createdBy: userName,
              };
            }
            
            await node.save();
            console.log(`Updated BpmnNode ${node.id}: createdBy = ${userName}`);
          }
        } catch (error) {
          console.error(`Error updating BpmnNode ${node.id}:`, error.message);
        }
      }
    }

    console.log('Update completed successfully!');
  } catch (error) {
    console.error('Error updating createdBy fields:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update function
updateCreatedByFields();
