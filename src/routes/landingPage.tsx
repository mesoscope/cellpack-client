import {ReactElement} from 'react';
import { Link } from 'react-router-dom';
import { PageRoutes } from '../constants/routes';

export default function LandingPage(): ReactElement {
    return (
        <div>
            <h1>Welcome to cellPACK</h1>
            <p>
                This is a simple landing page for the cellPACK client. 
                You can navigate to the viewer to see recipes in action.
            </p>
            <Link 
                to={PageRoutes.PACKING_PAGE}
            >
                Go to Packing Page →
            </Link>
        </div>
    );
}