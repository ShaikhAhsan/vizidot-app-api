const { Op } = require('sequelize');

class CrudController {
  /**
   * Generic list method with pagination and search
   */
  async list(req, res) {
    try {
      const { page = 1, limit = 10, search = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
      const model = req.model;
      const offset = (page - 1) * limit;
      
      // Build where clause for search
      const whereClause = {};
      // Hide soft-deleted records if model has is_delete flag
      if (model.rawAttributes && model.rawAttributes.is_delete) {
        whereClause.is_delete = false;
      }
      if (search) {
        // Search in name field (most models have this)
        if (model.rawAttributes.name) {
          whereClause.name = { [Op.like]: `%${search}%` };
        }
        // Search in title field if exists
        else if (model.rawAttributes.title) {
          whereClause.title = { [Op.like]: `%${search}%` };
        }
        // Search in business_name if exists
        else if (model.rawAttributes.business_name) {
          whereClause.business_name = { [Op.like]: `%${search}%` };
        }
      }
      
      // Add business filter if business_id is provided (from query or header)
      const businessId = req.query.business_id || req.businessContext;
      if (businessId && model.rawAttributes.business_id) {
        whereClause.business_id = businessId;
      }
      
      // Add user filter if user_id is provided
      if (req.query.user_id && model.rawAttributes.user_id) {
        whereClause.user_id = req.query.user_id;
      }
      
      // Add status filters
      if (req.query.is_active !== undefined && model.rawAttributes.is_active) {
        whereClause.is_active = req.query.is_active === 'true';
      }
      
      if (req.query.is_verified !== undefined && model.rawAttributes.is_verified) {
        whereClause.is_verified = req.query.is_verified === 'true';
      }
      
      const data = await model.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: req.include || []
      });
      
      res.json({
        success: true,
        data: data.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: data.count,
          totalPages: Math.ceil(data.count / limit)
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get single record by ID
   */
  async get(req, res) {
    try {
      const { id } = req.params;
      const model = req.model;
      
      const data = await model.findByPk(id, {
        include: req.include || []
      });
      
      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Record not found'
        });
      }
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create new record
   */
  async create(req, res) {
    try {
      const model = req.model;
      const data = await model.create(req.body);
      
      // If include is specified, fetch the created record with relations
      if (req.include && req.include.length > 0) {
        const createdData = await model.findByPk(data.id, {
          include: req.include
        });
        return res.status(201).json({
          success: true,
          data: createdData
        });
      }
      
      res.status(201).json({
        success: true,
        data
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update existing record
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const model = req.model;
      
      const data = await model.findByPk(id);
      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Record not found'
        });
      }
      
      await data.update(req.body);
      
      // If include is specified, fetch the updated record with relations
      if (req.include && req.include.length > 0) {
        const updatedData = await model.findByPk(data.id, {
          include: req.include
        });
        return res.json({
          success: true,
          data: updatedData
        });
      }
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete record
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const model = req.model;
      
      const data = await model.findByPk(id);
      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Record not found'
        });
      }
      
      // Soft delete using is_delete flag if present; otherwise use paranoid/hard delete
      if (model.rawAttributes && model.rawAttributes.is_delete) {
        await data.update({ is_delete: true });
      } else if (model.options.paranoid) {
        await data.destroy();
      } else {
        await data.destroy({ force: true });
      }
      
      res.json({
        success: true,
        message: 'Record deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Bulk delete records
   */
  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      const model = req.model;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'IDs array is required'
        });
      }
      
      const deletedCount = await model.destroy({
        where: {
          id: {
            [Op.in]: ids
          }
        }
      });
      
      res.json({
        success: true,
        message: `${deletedCount} records deleted successfully`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Bulk update records
   */
  async bulkUpdate(req, res) {
    try {
      const { ids, updates } = req.body;
      const model = req.model;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'IDs array is required'
        });
      }
      
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Updates object is required'
        });
      }
      
      const [updatedCount] = await model.update(updates, {
        where: {
          id: {
            [Op.in]: ids
          }
        }
      });
      
      res.json({
        success: true,
        message: `${updatedCount} records updated successfully`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get statistics for the model
   */
  async getStats(req, res) {
    try {
      const model = req.model;
      
      const stats = await model.findAll({
        attributes: [
          [model.sequelize.fn('COUNT', model.sequelize.col('id')), 'total'],
          [model.sequelize.fn('COUNT', model.sequelize.literal('CASE WHEN is_active = true THEN 1 END')), 'active'],
          [model.sequelize.fn('COUNT', model.sequelize.literal('CASE WHEN is_verified = true THEN 1 END')), 'verified']
        ],
        raw: true
      });
      
      res.json({
        success: true,
        data: stats[0] || { total: 0, active: 0, verified: 0 }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = CrudController;

