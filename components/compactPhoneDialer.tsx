export function CompactPhoneDialer({ 
  twilioNumber, 
  contacts = [], 
  onSelectContact,
  onMakeCall,
  onEndCall,
  isCallActive: externalIsCallActive,
  callDuration: externalCallDuration,
  currentCall
}: PhoneDialerProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [callInterval, setCallInterval] = useState<NodeJS.Timeout | null>(null)

  const dialPadButtons = [
    { digit: "1", letters: "" },
    { digit: "2", letters: "ABC" },
    { digit: "3", letters: "DEF" },
    { digit: "4", letters: "GHI" },
    { digit: "5", letters: "JKL" },
    { digit: "6", letters: "MNO" },
    { digit: "7", letters: "PQRS" },
    { digit: "8", letters: "TUV" },
    { digit: "9", letters: "WXYZ" },
    { digit: "*", letters: "" },
    { digit: "0", letters: "+" },
    { digit: "#", letters: "" },
  ]

  // Use external call state if provided
  const isCallActive = externalIsCallActive !== undefined ? externalIsCallActive : false
  const currentCallDuration = externalCallDuration !== undefined ? externalCallDuration : callDuration

  const handleDigitPress = useCallback((digit: string) => {
    if (phoneNumber.length < 20) {
      setPhoneNumber((prev) => prev + digit)
    }
  }, [phoneNumber.length])

  const handleDelete = useCallback(() => {
    setPhoneNumber((prev) => prev.slice(0, -1))
  }, [])

  const handleCall = () => {
    if (!phoneNumber && !isCallActive) return
    
    if (isCallActive) {
      // End call
      if (onEndCall) {
        onEndCall()
      } else {
        setIsMuted(false)
        setIsSpeakerOn(false)
      }
      if (callInterval) {
        clearInterval(callInterval)
        setCallInterval(null)
      }
      setCallDuration(0)
      setPhoneNumber("")
    } else {
      // Start call
      const contact = contacts.find(
        (c) => c.phone.replace(/\D/g, "") === phoneNumber.replace(/\D/g, "")
      )
      
      if (onMakeCall) {
        onMakeCall(phoneNumber, contact)
      }
      
      // Start duration timer if not externally managed
      if (externalCallDuration === undefined) {
        const interval = setInterval(() => {
          setCallDuration((prev) => prev + 1)
        }, 1000)
        setCallInterval(interval)
      }
    }
  }

  const handleContactSelect = (contact: Contact) => {
    setPhoneNumber(contact.phone)
    onSelectContact?.(contact)
  }

  const matchingContact = contacts.find(
    (c) => c.phone.replace(/\D/g, "") === phoneNumber.replace(/\D/g, "")
  )

  const currentCallContact = currentCall?.contact || contacts.find(
    (c) => c.phone.replace(/\D/g, "") === currentCall?.to.replace(/\D/g, "")
  )

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Phone
          </span>
          <Badge variant="outline" className="text-xs font-normal">
            {formatPhoneNumberUtil(twilioNumber)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4">
        {/* Compact Display */}
        <div className="mb-3">
          {isCallActive ? (
            <div className="mb-2">
              {currentCallContact ? (
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">{currentCallContact.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatPhoneNumberUtil(currentCallContact.phone)}
                    </div>
                  </div>
                </div>
              ) : currentCall?.to ? (
                <div className="mb-1">
                  <div className="text-sm font-medium">Calling...</div>
                  <div className="text-xs text-muted-foreground">
                    {formatPhoneNumberUtil(currentCall.to)}
                  </div>
                </div>
              ) : null}
              
              <div className="flex items-center justify-between">
                <div className="text-xl font-mono text-primary animate-pulse">
                  {formatDurationUtil(currentCallDuration)}
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {currentCall?.status || "active"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-1">
              {matchingContact ? (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-primary" />
                  <span className="text-sm font-medium">{matchingContact.name}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Enter number</div>
              )}
              
              {phoneNumber && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleDelete}
                >
                  <Delete className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          
          <div className="text-xl font-mono tracking-wider min-h-[1.5rem] border rounded px-3 py-2 bg-secondary/30">
            {isCallActive 
              ? (currentCallContact?.name || formatPhoneNumberUtil(currentCall?.to || ""))
              : formatPhoneNumberUtil(phoneNumber) || "Enter number"
            }
          </div>
        </div>

        {/* Dial Pad */}
        <div className="grid grid-cols-3 gap-1 mb-3">
          {dialPadButtons.map(({ digit, letters }) => (
            <Button
              key={digit}
              variant="secondary"
              className="h-10 flex flex-col items-center justify-center gap-0 hover:bg-primary/10 text-sm transition-all"
              onClick={() => handleDigitPress(digit)}
              disabled={isCallActive}
            >
              <span className="font-semibold">{digit}</span>
              {letters && <span className="text-[8px] text-muted-foreground">{letters}</span>}
            </Button>
          ))}
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-2 mt-auto pt-3 border-t">
          {isCallActive && (
            <>
              <Button
                variant="outline"
                size="icon"
                className={cn("h-8 w-8", isMuted && "bg-destructive/20 text-destructive border-destructive")}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={cn("h-8 w-8", isSpeakerOn && "bg-primary/20 text-primary border-primary")}
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              >
                {isSpeakerOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              </Button>
            </>
          )}
          
          <Button
            size="icon"
            className={cn(
              "h-10 w-10 transition-all",
              isCallActive
                ? "bg-destructive hover:bg-destructive/90 animate-pulse"
                : phoneNumber
                ? "bg-primary hover:bg-primary/90"
                : "bg-primary/30 cursor-not-allowed"
            )}
            onClick={handleCall}
            disabled={!phoneNumber && !isCallActive}
          >
            {isCallActive ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
