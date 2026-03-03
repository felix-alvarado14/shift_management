import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Archivo real recibido correctamente",
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Error uploading file" },
      { status: 500 }
    );
  }
}