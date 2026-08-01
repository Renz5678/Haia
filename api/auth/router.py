import logging

from auth.schemas import SignupRequest
from core.supabase import get_supabase_service_client
from fastapi import APIRouter, HTTPException
from integrations.gmail import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

@router.post("/signup")
async def signup(request: SignupRequest):
    supabase = get_supabase_service_client()
    
    try:
        # Create user without sending the default Supabase confirmation email
        res = supabase.auth.admin.create_user({
            "email": request.email,
            "password": request.password,
            "user_metadata": {"display_name": request.display_name},
            "email_confirm": False
        })
        user = res.user
        
        if not user:
            raise HTTPException(status_code=400, detail="Failed to create user")

        # Generate a secure action link for signup verification
        link_res = supabase.auth.admin.generate_link({
            "type": "signup",
            "email": request.email,
            "password": request.password
        })
        
        action_link = link_res.properties.action_link
        
        # Send via Gmail API
        send_verification_email(request.email, request.display_name, action_link)
        
        return {"status": "success", "message": "Verification email sent via Gmail API"}
        
    except Exception as e:
        logger.error(f"Signup error: {e}")
        # Return 400 with the error message so the frontend can display it
        raise HTTPException(status_code=400, detail=str(e))
