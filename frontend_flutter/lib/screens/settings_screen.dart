import 'package:flutter/material.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('הגדרות'), // Settings in Hebrew
      ),
      body: Center(
        child: Text(
          'Settings screen - To be implemented',
          style: Theme.of(context).textTheme.bodyLarge,
        ),
      ),
    );
  }
}
