const express = require('express');
const router = express.Router();

const httpStatusCodes = require('http-status-codes');
// Get around not being able to use import statements
const StatusCodes = httpStatusCodes.StatusCodes;
/* GET home page. */

router.get(`/test`,
  [],
  (req, res) => {
    
    res.status(StatusCodes.OK).json({
      success: "Successfully got /api/poker/test",
      check: 69,
    }).end();
    return;
  })


module.exports = router;
