import { NextResponse, NextRequest } from "next/server";

interface NextRequestWithImage extends NextRequest {
    imageURL: string
}

export async function POST(req: NextRequestWithImage, res: NextResponse){
    console.log("POST received")

    const  { imageURL } = await req.json()

    console.log(imageURL)

    return NextResponse.json({message : "Teste"}, {
        status: 200
    })
}