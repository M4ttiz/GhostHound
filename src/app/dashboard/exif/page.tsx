"use client";

import { useState, useRef } from "react";
import { FileImage, Upload, MapPin, Calendar, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import exifJs from "exif-js";

// exif-js published TypeScript definitions are incomplete; the runtime API
// accepts an HTMLImageElement here.
const exif = exifJs as unknown as {
  getData: (img: HTMLImageElement, cb: () => void) => void;
  getAllTags: (img: HTMLImageElement) => Record<string, unknown>;
};

export default function ExifPage() {
  const [image, setImage] = useState<string | null>(null);
  const [exifData, setExifData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setImage(null);
    setExifData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataURL = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setImage(dataURL);

        exif.getData(img, function () {
          const allTags = exif.getAllTags(img);
          setExifData(allTags);
          setLoading(false);
        });
      };
      img.src = dataURL;
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setImage(null);
    setExifData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const convertDMSToDD = (degrees: number, minutes: number, seconds: number, direction: string) => {
    let dd = degrees + minutes / 60 + seconds / 3600;
    if (direction === "S" || direction === "W") {
      dd = dd * -1;
    }
    return dd;
  };

  const getGPSCoordinates = () => {
    if (!exifData || !exifData.GPSLatitude || !exifData.GPSLongitude) {
      return null;
    }

    const lat = convertDMSToDD(
      exifData.GPSLatitude[0],
      exifData.GPSLatitude[1],
      exifData.GPSLatitude[2],
      exifData.GPSLatitudeRef
    );
    const lon = convertDMSToDD(
      exifData.GPSLongitude[0],
      exifData.GPSLongitude[1],
      exifData.GPSLongitude[2],
      exifData.GPSLongitudeRef
    );

    return { lat, lon };
  };

  const gps = getGPSCoordinates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">EXIF Extractor</h1>
        <p className="text-muted-foreground mt-2">
          Extract metadata from images locally (no data leaves your browser)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
          <CardDescription>Select an image to extract EXIF metadata</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-muted-foreground">
                  JPG, PNG, TIFF supported
                </span>
              </label>
            </div>

            {image && (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={image}
                    alt="Uploaded"
                    className="max-w-full max-h-96 mx-auto rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleClear}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {exifData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">EXIF Metadata</h2>
            <Button
              variant="outline"
              onClick={() => {
                const data = JSON.stringify(exifData, null, 2);
                const blob = new Blob([data], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "exif-data.json";
                a.click();
              }}
            >
              Export JSON
            </Button>
          </div>

          {gps && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  GPS Coordinates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Latitude</div>
                    <div className="font-semibold">{gps.lat.toFixed(6)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Longitude</div>
                    <div className="font-semibold">{gps.lon.toFixed(6)}</div>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${gps.lat},${gps.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View on Google Maps
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {exifData.DateTimeOriginal && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5" />
                    Date Taken
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-semibold">{exifData.DateTimeOriginal}</div>
                </CardContent>
              </Card>
            )}

            {exifData.Make && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Camera className="h-5 w-5" />
                    Camera
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-semibold">
                    {exifData.Make} {exifData.Model}
                  </div>
                </CardContent>
              </Card>
            )}

            {exifData.Software && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Software</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-semibold">{exifData.Software}</div>
                </CardContent>
              </Card>
            )}

            {exifData.PixelXDimension && exifData.PixelYDimension && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resolution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-semibold">
                    {exifData.PixelXDimension} x {exifData.PixelYDimension}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(exifData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {exifData && Object.keys(exifData).length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileImage className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="font-semibold">No EXIF Data Found</div>
                <p className="text-sm text-muted-foreground">
                  This image doesn&apos;t contain any EXIF metadata.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
