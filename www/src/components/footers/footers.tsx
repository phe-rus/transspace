import { Link } from "@tanstack/react-router"

export const Footers = () => {
    return (
        <footer className='flex flex-col bg-muted'>
            <section className='container flex flex-col gap-5 py-20 mx-auto w-full md:max-w-5xl'>
                <div className='grid grid-cols-12 gap-5 w-full'>
                    <div className='flex flex-col col-span-12 md:col-span-3'>
                        <h1>Transspace</h1>
                        <p>
                            A platform designed by Pherus around Q2Q
                            (Queer-to-Queer) knowledge sharing. Built
                            with love, trust, and absolute discretion
                            to serve the global LGBTQIA+ community.
                        </p>
                    </div>

                    <div className='flex flex-col col-span-12 md:col-span-9'>
                        <div className='columns-2 lg:columns-3 gap-5 w-fit md:ml-auto'>
                            {[
                                {
                                    title: 'Resources',
                                    items: [
                                        {
                                            label: 'Resources',
                                            to: '/'
                                        },
                                        {
                                            label: 'Opportunities',
                                            to: '/'
                                        },
                                        {
                                            label: 'Legal',
                                            to: '/'
                                        },
                                        {
                                            label: 'learn new skills',
                                            to: '/'
                                        },
                                        {
                                            label: 'The fog of history',
                                            to: '/'
                                        },
                                    ]
                                },
                                {
                                    title: 'Resources',
                                    items: [
                                        {
                                            label: 'Resources',
                                            to: '/'
                                        },
                                        {
                                            label: 'Opportunities',
                                            to: '/'
                                        },
                                        {
                                            label: 'Legal',
                                            to: '/'
                                        },
                                        {
                                            label: 'learn new skills',
                                            to: '/'
                                        },
                                        {
                                            label: 'The fog of history',
                                            to: '/'
                                        },
                                    ]
                                },
                                {
                                    title: 'Resources',
                                    items: [
                                        {
                                            label: 'Resources',
                                            to: '/'
                                        },
                                        {
                                            label: 'Opportunities',
                                            to: '/'
                                        },
                                        {
                                            label: 'Legal',
                                            to: '/'
                                        },
                                        {
                                            label: 'learn new skills',
                                            to: '/'
                                        },
                                        {
                                            label: 'The fog of history',
                                            to: '/'
                                        },
                                    ]
                                }
                            ].map((items, index) => {
                                return (
                                    <div key={index} className='flex flex-col break-inside-avoid mb-5'>
                                        <h2>{items.title}</h2>

                                        <div className='flex flex-col'>
                                            {items.items.map((ims, dx) => {
                                                return (
                                                    <Link key={dx} to={ims.to}>{ims.label}</Link>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}

                        </div>
                    </div>
                </div>

                <span className='w-full h-px bg-primary' />
            </section>
        </footer>
    )
}