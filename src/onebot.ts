type MessageChain_Text = {
    text: string
};

type MessageChain_Image = {
    summary: string
    file: string
    url: string
};

type MessageChain = {
    type: "text"|"image",
    data: MessageChain_Text|MessageChain_Image
}