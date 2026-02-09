module.exports = (req, res) => {
  res.status(200).json({ status: "working", method: req.method });
};
