import Navbar from "../Components/Navbar";
import Hero from "../Components/Hero"
import Features from "../Components/Features";
import Work from "../Components/Work"
import Footer from "../Components/Footer";


function Home(){
   return(
     <div>
        <Navbar></Navbar>
        <Hero></Hero>
        <Features></Features>
        <Work></Work>
        <Footer></Footer>
     </div>
   );
}

export default Home