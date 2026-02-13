$body = @{
    model = "glm-4.6v"
    messages = @(
        @{
            role = "user"
            content = @(
                @{
                    type = "image_url"
                    image_url = @{
                        url = "https://cloudcovert-1305175928.cos.ap-guangzhou.myqcloud.com/%E5%9B%BE%E7%89%87grounding.PNG"
                    }
                },
                @{
                    type = "text"
                    text = "Where is the second bottle of beer from the right on the table? Provide coordinates in [[xmin,ymin,xmax,ymax]] format"
                }
            )
        }
    )
    thinking = @{ type = "enabled" }
} | ConvertTo-Json -Depth 10

$headers = @{
    "Authorization" = "Bearer aaa40df3ad354a00a516cad9d0bb5cdb.CYSCyGYeBeZE25Xz"
    "Content-Type"  = "application/json"
}

$response = Invoke-RestMethod -Uri "https://api.z.ai/api/paas/v4/chat/completions" -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
$response | ConvertTo-Json -Depth 10
