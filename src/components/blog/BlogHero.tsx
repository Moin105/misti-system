const BlogHero = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20 mt-20 mb-12">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      <div className="relative container mx-auto px-4">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold mb-6 text-foreground">
            Blog
          </h1>
          <p className="text-xl text-foreground/80 leading-relaxed">
            Explore the latest gaming insights, boost guides, and industry news
          </p>
        </div>
      </div>
    </div>
  );
};

export default BlogHero;
