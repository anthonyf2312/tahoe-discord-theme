// Renders SF Symbols as square PNGs for use as CSS masks (only the alpha matters).
// usage: swift render.swift <outdir> <canvas px> <point size> <weight> <symbol.name>...
import AppKit

let a = CommandLine.arguments
let out = URL(fileURLWithPath: a[1])
let canvas = Int(a[2])!, pt = CGFloat(Double(a[3])!)
let weights: [String: NSFont.Weight] = ["light": .light, "regular": .regular, "medium": .medium, "semibold": .semibold]
let weight = weights[a[4]] ?? .regular
for name in a.dropFirst(5) {
    guard let base = NSImage(systemSymbolName: name, accessibilityDescription: nil),
          // Monochrome keeps every layer as plain alpha. SF_MODE=hierarchical draws secondary layers
          // faded, so build.py can tell them apart (used to turn filled faces into outlines).
          let img = base.withSymbolConfiguration(.init(pointSize: pt, weight: weight)
              .applying(ProcessInfo.processInfo.environment["SF_MODE"] == "hierarchical"
                        ? .init(hierarchicalColor: .black) : .preferringMonochrome())) else {
        print("MISSING \(name)"); continue
    }
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: canvas, pixelsHigh: canvas,
                               bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let s = img.size
    img.draw(in: NSRect(x: (CGFloat(canvas) - s.width) / 2, y: (CGFloat(canvas) - s.height) / 2,
                        width: s.width, height: s.height))
    NSGraphicsContext.restoreGraphicsState()
    try! rep.representation(using: .png, properties: [:])!.write(to: out.appendingPathComponent(name + ".png"))
    print("ok \(name) \(Int(s.width))x\(Int(s.height))")
}
