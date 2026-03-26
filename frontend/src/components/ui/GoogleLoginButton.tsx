import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

const GoogleAuthButton = () => {
  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        try {
          const res = await axios.post(
            "http://localhost:8080/api/users/google-login",
            {
              token: credentialResponse.credential,
            },
            { withCredentials: true }
          );

          console.log(res.data);

          alert("Loggged in sucecssfully");
          window.location.href = "/home";
        } catch (err) {
          alert(err);
          console.error(err);
        }
      }}
      onError={() => {
        console.log("Login Failed");
      }}
    />
  );
};

export default GoogleAuthButton;