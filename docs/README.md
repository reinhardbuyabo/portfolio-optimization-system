# Documentation Index

This folder contains all documentation for the Portfolio Optimization System.

## Directory Structure

```
docs/
├── v4-integration/           # V4 ML Model Integration Documentation
│   ├── README.md            # Main integration guide
│   ├── INTEGRATION_GUIDE.md # Detailed integration guide with code examples
│   ├── QUICK_REFERENCE.md   # Quick reference card
│   ├── SUMMARY.md           # Technical summary and architecture
│   └── CHANGES.md           # Complete file changes documentation
└── README.md                # This file
```

## V4 ML Model Integration

Complete documentation for integrating the V4 log-transformed LSTM models with the frontend.

### Quick Links
- 📖 [Integration Guide](v4-integration/README.md) - Start here for integration
- 🚀 [Quick Reference](v4-integration/QUICK_REFERENCE.md) - Quick start and code snippets
- 📊 [Technical Summary](v4-integration/SUMMARY.md) - Architecture and details
- 📝 [Complete Changes](v4-integration/CHANGES.md) - All file modifications
- 🔄 [Migration Status](v4-integration/MIGRATION_STATUS.md) - Current migration progress

### What's Included
- Stock-specific models (5 stocks): MAPE 2-9%, Sharpe 7-13
- General model (50+ stocks): MAPE ~4.5%
- Multiple prediction horizons: 1d, 5d, 10d, 30d
- Full TypeScript support with type-safe APIs
- React component examples
- Error handling and performance tips

## Additional Documentation

### Testing
- Test Documentation: `../__tests__/README.md`
- Integration Tests: Run `./test-v4-integration.sh`

### ML/AI
- Model Training: `../ml/PHASE3_TRAINING_COMPLETE.md`
- LSTM Improvements: `../ml/LSTM_IMPROVEMENTS.md`
- Hybrid System: `../ml/HYBRID_SYSTEM_COMPLETE.md`

### Project Root
- Main README: `../README.md`
- Quick Start: `../QUICK_START.md`
- Status Updates: `../STATUS.md`

## Getting Help

1. **For V4 Integration**: Start with [v4-integration/README.md](v4-integration/README.md)
2. **For API Details**: See [Quick Reference](v4-integration/QUICK_REFERENCE.md)
3. **For Testing**: Run `./test-v4-integration.sh`
4. **For Issues**: Check [Troubleshooting](v4-integration/INTEGRATION_GUIDE.md#troubleshooting)

## Contributing Documentation

When adding new documentation:
1. Place markdown files in appropriate subdirectories within `docs/`
2. Update this index file
3. Add cross-references where relevant
4. Keep the main `README.md` at project root minimal

---

*Last Updated: November 19, 2024*
