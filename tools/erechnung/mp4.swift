// Setzt Einzelbilder (PNG, alle gleich groß) zu einem MP4-Video zusammen (H.264, ohne Ton) – für das Startvideo von
// SmartFormular E-Rechnung lite. Die Liste nennt je Zeile Datei und Anzeigedauer in Bildern bei 30 Bildern je Sekunde.
//   swift mp4.swift <liste.txt> <ausgabe.mp4>
import AVFoundation
import AppKit

let args = CommandLine.arguments
guard args.count == 3 else { print("Aufruf: swift mp4.swift <liste.txt> <ausgabe.mp4>"); exit(1) }
let zeilen = try String(contentsOfFile: args[1], encoding: .utf8).split(separator: "\n").map { $0.split(separator: "\t") }
let ziel = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: ziel)

func bild(_ pfad: String) -> CGImage {
  let i = NSImage(contentsOfFile: pfad)!
  var r = CGRect(origin: .zero, size: i.size)
  return i.cgImage(forProposedRect: &r, context: nil, hints: nil)!
}
let erstes = bild(String(zeilen[0][0]))
let breite = erstes.width, hoehe = erstes.height
let schreiber = try AVAssetWriter(outputURL: ziel, fileType: .mp4)
let eingang = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: breite, AVVideoHeightKey: hoehe,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 6_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel],
])
let adapter = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: eingang, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: breite, kCVPixelBufferHeightKey as String: hoehe,
])
schreiber.add(eingang)
schreiber.startWriting()
schreiber.startSession(atSourceTime: .zero)

func puffer(_ b: CGImage) -> CVPixelBuffer {
  var p: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adapter.pixelBufferPool!, &p)
  CVPixelBufferLockBaseAddress(p!, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(p!), width: breite, height: hoehe, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(p!),
                      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  ctx.draw(b, in: CGRect(x: 0, y: 0, width: breite, height: hoehe))
  CVPixelBufferUnlockBaseAddress(p!, [])
  return p!
}
var nr: Int64 = 0
for z in zeilen {
  let p = puffer(bild(String(z[0])))
  for _ in 0..<(Int(z[1]) ?? 1) {
    while !eingang.isReadyForMoreMediaData { usleep(2000) }
    adapter.append(p, withPresentationTime: CMTime(value: nr, timescale: 30))
    nr += 1
  }
}
eingang.markAsFinished()
let fertig = DispatchSemaphore(value: 0)
schreiber.finishWriting { fertig.signal() }
fertig.wait()
print("\(args[2]): \(breite) × \(hoehe), \(Double(nr) / 30) s")
