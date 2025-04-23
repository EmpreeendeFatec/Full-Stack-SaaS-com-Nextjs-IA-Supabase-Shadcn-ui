import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import { resolve } from "path";

interface NextRequestWithImage extends NextRequest {
    imageURL: string
}

export async function POST(req: NextRequestWithImage, res: NextResponse){
    const  { imageURL } = await req.json()

    const supabase = createRouteHandlerClient({cookies})

    const {data: {session}, error} = await supabase.auth.getSession()

    if(!session || error){
        return new NextResponse("Log in order to store images", {
                status: 500,
        });
    }

    

    const startRestoreProcess = await fetch("https://api.replicate.com/v1/predictions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Token " + process.env.REPLICATE_API_TOKEN,
            },
            body: JSON.stringify({
                version: "0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c",
                input: {
                    img: imageURL,
                    version: "v1.4",
                    scale: 2
                }
            }),
        }
    )
    if (!startRestoreProcess.ok) {
        const errorText = await startRestoreProcess.text();
        console.error("Erro na chamada à Replicate:", errorText);
        return new NextResponse("Erro ao iniciar o processo na Replicate", {
            status: 500,
        });
    }

    let jsonStartProcessResponse = await startRestoreProcess.json()
    let endpointUrl = jsonStartProcessResponse.urls.get

    let restoredImage: string | null = null

    while(!restoredImage){
        console.log("Pooling image from Replicate...")

        let finalResponse = await fetch(endpointUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Token " + process.env.REPLICATE_API_TOKEN,
            },
        })

        let jsonFinalResponse = await finalResponse.json()

        if(jsonFinalResponse.status === "succeeded"){
            restoredImage = jsonFinalResponse.output;
        } else if(jsonFinalResponse.status === "failed"){
            break; //TODO: gerar erro para o usuário
        } else{
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            })
        }
    }

    return NextResponse.json({data : restoredImage ? restoredImage : "Failed to restore image"}, {
        status: 200
    })
}