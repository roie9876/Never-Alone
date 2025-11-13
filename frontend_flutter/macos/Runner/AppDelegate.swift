import Cocoa
import FlutterMacOS

@main
class AppDelegate: FlutterAppDelegate {
  private let appleScriptChannelName = "com.neveralone/appleScript"

  override func applicationDidFinishLaunching(_ notification: Notification) {
    if let controller = mainFlutterWindow?.contentViewController as? FlutterViewController {
      let channel = FlutterMethodChannel(
        name: appleScriptChannelName,
        binaryMessenger: controller.engine.binaryMessenger
      )

      channel.setMethodCallHandler { call, result in
        guard call.method == "run" else {
          result(FlutterMethodNotImplemented)
          return
        }

        guard
          let arguments = call.arguments as? [String: Any],
          let source = arguments["source"] as? String
        else {
          result(FlutterError(
            code: "invalid_args",
            message: "Expected AppleScript source string",
            details: nil
          ))
          return
        }

        var appleScriptError: NSDictionary?
        let script = NSAppleScript(source: source)
        let descriptor = script?.executeAndReturnError(&appleScriptError)

        if let errorInfo = appleScriptError {
          let message = errorInfo[NSAppleScript.errorMessage] as? String ?? "Unknown error"
          let number = errorInfo[NSAppleScript.errorNumber] as? Int ?? -1
          result([
            "status": "error",
            "code": number,
            "message": message
          ])
        } else {
          let output = descriptor?.stringValue ?? ""
          result([
            "status": "ok",
            "output": output
          ])
        }
      }
    }

    super.applicationDidFinishLaunching(notification)
  }

  override func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    return true
  }

  override func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool {
    return true
  }
}
